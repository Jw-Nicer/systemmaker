import { getAdminDb } from "@/lib/firebase/admin";
import {
  enforceRateLimit,
  hasFilledHoneypot,
} from "@/lib/security/request-guards";
import { agentChatSchema } from "@/lib/validation";
import { orchestrateAgentPipelineStreaming, type AgentStep } from "@/lib/agents/runner";
import {
  detectPhase,
  extractIntakeData,
  extractedHasChanges,
  generateConversationalResponse,
  buildPlanSummary,
  buildDetailedPlanContext,
  buildConversationSummary,
  detectContradiction,
  type ConversationContext,
} from "@/lib/agents/conversation";
import { getIndustryProbingsFromFirestore } from "@/lib/firestore/industry-probing";
import {
  recallVisitorContext,
  storeMemory,
  recordInteraction,
} from "@/lib/agents/memory";
import { computeLeadScore } from "@/lib/leads/scoring";
import { findLeadByEmail, normalizeEmail } from "@/lib/leads/dedup";
import { renderPreviewPlanHTML } from "@/lib/agents/email-template";
import { sendAdminNotification } from "@/lib/email/admin-notification";
import { enrollInNurture } from "@/lib/email/nurture-sequence";
import { Resend } from "resend";
import { buildPublicPlanPath, buildPublicPlanUrl } from "@/lib/urls";
import type {
  ConversationPhase,
  ChatMessage,
  ExtractedIntake,
  SSEEventType,
} from "@/types/chat";
import type { PreviewPlan } from "@/types/preview-plan";
import type { ExperimentAssignment } from "@/types/experiment";

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

// Track concurrent SSE connections per IP with staleness cleanup
const activeConnections = new Map<string, { count: number; lastSeen: number }>();
const MAX_SSE_CONNECTIONS_PER_IP = 3;
const CONNECTION_STALE_MS = 5 * 60_000; // 5 minutes

// Periodic cleanup of stale entries to prevent unbounded Map growth
let cleanupScheduled = false;
function scheduleConnectionCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of activeConnections.entries()) {
      if (now - data.lastSeen > CONNECTION_STALE_MS) {
        activeConnections.delete(ip);
      }
    }
  }, 60_000).unref?.();
}

function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function reserveSSEConnection(ip: string): boolean {
  const current = activeConnections.get(ip);
  const currentConns = current?.count ?? 0;
  if (currentConns >= MAX_SSE_CONNECTIONS_PER_IP) {
    return false;
  }
  activeConnections.set(ip, { count: currentConns + 1, lastSeen: Date.now() });
  return true;
}

export function releaseSSEConnection(ip: string) {
  const entry = activeConnections.get(ip);
  if (!entry || entry.count <= 1) {
    activeConnections.delete(ip);
    return;
  }
  activeConnections.set(ip, { count: entry.count - 1, lastSeen: Date.now() });
}

export function getActiveSSEConnectionCount(ip: string) {
  return activeConnections.get(ip)?.count ?? 0;
}

export function resetSSEConnectionTracking() {
  activeConnections.clear();
}

function sseEncode(type: SSEEventType, data: Record<string, unknown>): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

function createSSEStream(
  handler: (
    write: (type: SSEEventType, data: Record<string, unknown>) => void,
    close: () => void
  ) => Promise<void>,
  onClose?: () => void
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let finalized = false;

  const finalize = () => {
    if (finalized) return;
    finalized = true;
    onClose?.();
  };

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (type: SSEEventType, data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(sseEncode(type, data)));
        } catch {
          // Stream may have been closed by the client
        }
      };

      const close = () => {
        try {
          write("done", {});
          controller.close();
        } catch {
          // Already closed
        } finally {
          finalize();
        }
      };

      try {
        await handler(write, close);
      } catch (err) {
        console.error("SSE handler error:", err);
        write("error", { message: "Something went wrong. Please try again." });
        close();
      }
    },
    cancel() {
      finalize();
    },
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const ip = getClientIP(request);
  scheduleConnectionCleanup();

  // Rate limit: 20 messages per 10 minutes per IP
  const limited = await enforceRateLimit(request, {
    keyPrefix: "agent_chat",
    windowMs: 10 * 60_000,
    maxRequests: 20,
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (hasFilledHoneypot(body)) {
    return new Response(JSON.stringify({ error: "Validation failed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = agentChatSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request data" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { message, history, phase: clientPhase, extracted, plan: clientPlan } = parsed.data;
  const landingPath = parsed.data.landing_path;
  const experimentAssignments =
    parsed.data.experiment_assignments as ExperimentAssignment[] | undefined;

  if (!reserveSSEConnection(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many concurrent connections" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const stream = createSSEStream(async (write, close) => {
    // Step 0: Recall memory for returning visitors (non-blocking)
    const visitorEmail = extracted.email ?? "";
    const memoryPromise = visitorEmail
      ? recallVisitorContext(visitorEmail).catch(() => null)
      : Promise.resolve(null);

    // Step 0b: Warm the industry-probing cache (non-blocking).
    // The chat agent's prompt builders read this synchronously via
    // getCachedIndustryProbings() — kicking it off here means the cache
    // is populated by the time generateConversationalResponse runs on
    // the very first request after a cold start. The fetch is internally
    // TTL-cached and coalesces concurrent calls.
    const industryProbingPromise = getIndustryProbingsFromFirestore().catch(() => null);

    // Step 1: Extract intake data and detect phase
    let updatedExtracted: ExtractedIntake = { ...extracted };

    if (clientPhase === "gathering" || clientPhase === "confirming") {
      updatedExtracted = await extractIntakeData(
        history as ChatMessage[],
        message,
        extracted
      );
    }

    // Step 1b: Detect contradictions (corrections to previously extracted data)
    const corrections: string[] = [];
    const contradiction = detectContradiction(message, extracted);
    if (contradiction) {
      corrections.push(contradiction);
    }

    // Step 2: Detect the correct phase
    const messageCount = Array.isArray(history) ? history.length : 0;
    const nextPhase: ConversationPhase = detectPhase(
      clientPhase,
      updatedExtracted,
      message,
      messageCount
    );

    // Resolve memory context (should be done by now)
    const memoryContext = await memoryPromise;

    // Emit phase change if it changed
    if (nextPhase !== clientPhase) {
      write("phase_change", { from: clientPhase, to: nextPhase });
    }

    // Step 3: Handle based on phase
    if (nextPhase === "building") {
      // Transition to building — run the full agent chain with streaming
      write("message", {
        content:
          "Great, let me build your Preview Plan now. This takes about 30 seconds — I'll show each section as it's ready.",
      });

      const input = {
        industry: updatedExtracted.industry ?? "Unknown",
        bottleneck: updatedExtracted.bottleneck ?? "Not specified",
        current_tools: updatedExtracted.current_tools ?? "Not specified",
        urgency: updatedExtracted.urgency,
        volume: updatedExtracted.volume,
      };

      // Create lead record (non-blocking — don't delay plan generation)
      const db = getAdminDb();
      const leadWritePromise = db.collection("leads").add({
        name: "",
        email: "",
        company: "",
        industry: (input.industry ?? "Unknown").slice(0, 200),
        bottleneck: (input.bottleneck ?? "").slice(0, 2000),
        tools: (input.current_tools ?? "").slice(0, 500),
        urgency: (input.urgency ?? "").slice(0, 20),
        status: "new",
        source: "agent_chat",
        landing_path: landingPath ?? null,
        experiment_assignments: experimentAssignments ?? [],
        score: computeLeadScore({
          email: "",
          company: "",
          bottleneck: input.bottleneck,
          urgency: input.urgency,
          completed_agent_demo: true,
          preview_plan_sent: false,
        }),
        created_at: new Date(),
      }).catch(() => {
        console.error("Failed to create lead");
        return null;
      });

      // Run the streaming agent chain (starts immediately, doesn't wait for lead write)
      const { plan } = await orchestrateAgentPipelineStreaming(
        input,
        (step: AgentStep, label: string, data: unknown) => {
          write("plan_section", {
            section: step,
            label,
            content: data ? JSON.stringify(data) : null,
          });
        },
        (step: AgentStep, errorMsg: string) => {
          write("error", {
            message: `Section "${step}" failed to generate. The rest of your plan is still available.`,
            section: step,
            recoverable: true,
          });
        }
      );

      // Resolve lead write (should be done by now since agent chain took ~30s)
      const leadRef = await leadWritePromise;
      const leadId = leadRef?.id;

      if (leadId) {
        db.collection("events").add({
          event_name: "lead_submit",
          payload: {
            source: "agent_chat",
            landing_path: landingPath ?? null,
            experiment_assignments: experimentAssignments ?? [],
          },
          lead_id: leadId,
          created_at: new Date(),
        }).catch(() => {});
      }

      // Save plan to Firestore (for shareable URLs)
      let planId: string | undefined;
      try {
        const planRef = await db.collection("plans").add({
          preview_plan: JSON.parse(JSON.stringify(plan)),
          input_summary: {
            industry: input.industry,
            bottleneck_summary:
              input.bottleneck.length > 100
                ? input.bottleneck.slice(0, 100) + "..."
                : input.bottleneck,
          },
          lead_id: leadId ?? null,
          created_at: new Date(),
          view_count: 0,
          is_public: true,
          version: 1,
          versions: [],
        });
        planId = planRef.id;

        // Link plan to lead (fire-and-forget)
        if (leadId) {
          db.collection("leads").doc(leadId).update({ plan_id: planId }).catch(() => {});
        }
      } catch (err) {
        console.error("Failed to save plan:", err);
      }

      // Auto-send plan email if we have the visitor's email
      let emailAutoSent = false;
      const extractedEmail = updatedExtracted.email;
      const extractedName = updatedExtracted.name || "";

      if (extractedEmail && leadId && plan) {
        try {
          const apiKey = process.env.RESEND_API_KEY;
          if (apiKey) {
            const email = normalizeEmail(extractedEmail);
            const resend = new Resend(apiKey);
            const html = renderPreviewPlanHTML(
              plan as unknown as PreviewPlan,
              extractedName,
              leadId
            );

            await resend.emails.send({
              from: "Nicer Systems <onboarding@resend.dev>",
              to: email,
              subject: "Your Preview Plan from Nicer Systems",
              html,
            });

            // Dedup: check if another lead already owns this email
            let effectiveLeadId = leadId;
            const existing = await findLeadByEmail(email);
            if (existing && existing.id !== leadId) {
              // Merge into existing lead
              const mergeData: Record<string, unknown> = {
                name: extractedName || existing.data.name,
                updated_at: new Date(),
              };
              if (planId) mergeData.plan_id = planId;
              if (input.industry && !existing.data.industry) {
                mergeData.industry = input.industry;
              }
              if (input.bottleneck && !existing.data.bottleneck) {
                mergeData.bottleneck = input.bottleneck;
              }
              await db.collection("leads").doc(existing.id).update(mergeData);
              await db.collection("leads").doc(leadId).update({
                status: "merged",
                merged_into: existing.id,
                updated_at: new Date(),
              });
              effectiveLeadId = existing.id;
            }

            // Update lead with email + score
            const score = computeLeadScore({
              email,
              company: "",
              bottleneck: input.bottleneck,
              urgency: input.urgency,
              completed_agent_demo: true,
              preview_plan_sent: true,
            });

            await db.collection("leads").doc(effectiveLeadId).update({
              name: extractedName,
              email,
              score: Math.max(score, 0),
              preview_plan_sent_at: new Date(),
              updated_at: new Date(),
            });

            // Log activity
            db.collection("leads").doc(effectiveLeadId).collection("activity").add({
              type: "email_sent",
              content: "Preview Plan auto-sent during chat",
              created_at: new Date(),
            }).catch(() => {});

            // Fire-and-forget: admin notification + nurture
            sendAdminNotification({
              name: extractedName,
              email,
              industry: input.industry,
              bottleneck: input.bottleneck,
              score,
              source: "agent_chat",
            }).catch(() => {});

            enrollInNurture({
              lead_id: effectiveLeadId,
              name: extractedName,
              email,
              industry: input.industry,
              bottleneck: input.bottleneck,
            }).catch(() => {});

            emailAutoSent = true;
          }
        } catch (err) {
          console.error("Auto-send email failed:", err);
          // Non-fatal — fall back to manual email capture
        }
      }

      // Store memory for returning visitor context (fire-and-forget)
      if (extractedEmail) {
        storeMemory(extractedEmail, {
          name: extractedName || undefined,
          industry: input.industry,
          bottleneck: input.bottleneck,
          planId: planId,
          tools: input.current_tools ? input.current_tools.split(",").map((t: string) => t.trim()) : undefined,
          interaction: {
            type: "plan_generated",
            summary: `Generated plan for ${input.industry}: ${input.bottleneck.slice(0, 80)}`,
          },
        }).catch(() => {});
      }

      write("plan_complete", {
        plan_id: planId ?? "",
        lead_id: leadId ?? "",
        share_url: planId ? buildPublicPlanUrl(request, planId) : "",
        email_auto_sent: emailAutoSent,
      });

      // Emit phase change to complete
      write("phase_change", { from: "building", to: "complete" });

      // Post-plan message — both branches get a share_link so the chat can
      // surface a "View full plan" button regardless of whether the email
      // was auto-sent.
      const sharePath = planId ? buildPublicPlanPath(planId) : undefined;
      if (emailAutoSent) {
        write("message", {
          content: `Your Preview Plan is ready! I've sent a copy to ${extractedEmail}. Feel free to ask any follow-up questions about the plan.`,
          share_link: sharePath,
        });
      } else {
        write("message", {
          content:
            "Your Preview Plan is ready! Want me to email it to you? Just share your name and email, and I'll send the full plan to your inbox.",
          email_capture: true,
          share_link: sharePath,
        });
      }

      close();
      return;
    }

    // Make sure the industry-probing cache is warm before the prompt
    // builders read it synchronously inside generateConversationalResponse.
    // After the first request this is effectively zero-cost (cache hit).
    await industryProbingPromise;

    // For conversational phases (gathering, confirming, follow_up):
    // Build full conversation context for accurate, consistent responses
    const conversationCtx: ConversationContext = {
      corrections,
      conversationSummary: buildConversationSummary(
        updatedExtracted,
        history as ChatMessage[],
        corrections
      ),
    };

    // Add memory context for returning visitors
    if (memoryContext) {
      conversationCtx.memoryContext = memoryContext;
    }

    // For follow-up: build detailed plan context (not just summary)
    if (nextPhase === "follow_up" && clientPlan && typeof clientPlan === "object") {
      conversationCtx.detailedPlanContext = buildDetailedPlanContext(
        clientPlan as Record<string, unknown>
      );
      conversationCtx.planSummary = buildPlanSummary(
        clientPlan as Parameters<typeof buildPlanSummary>[0]
      );

      // Record follow-up interaction in memory
      if (visitorEmail) {
        recordInteraction(visitorEmail, "question_asked", message.slice(0, 100)).catch(() => {});
      }
    }

    // Stream conversational response with full context
    for await (const chunk of generateConversationalResponse(
      nextPhase,
      history as ChatMessage[],
      updatedExtracted,
      message,
      conversationCtx
    )) {
      write("message", { content: chunk, is_chunk: true });
    }

    // Send the updated extracted data to the client only when there's an
    // actual change. Previously this fired every gathering turn even when
    // extraction produced no new fields, wasting bandwidth and forcing
    // an unnecessary client re-render. Phase changes are also a trigger
    // because the client needs to know about state transitions.
    const phaseChanged = nextPhase !== clientPhase;
    const dataChanged = extractedHasChanges(extracted, updatedExtracted);
    if (phaseChanged || dataChanged) {
      write("message", {
        content: "",
        extracted: updatedExtracted,
        is_extraction_update: true,
      });
    }

    close();
  }, () => releaseSSEConnection(ip));

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
