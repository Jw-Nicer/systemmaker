import { getAdminDb } from "@/lib/firebase/admin";
import {
  enforceRateLimit,
  hasFilledHoneypot,
} from "@/lib/security/request-guards";
import { agentChatSchema } from "@/lib/validation";
import { orchestrateAgentPipelineStreaming, type AgentStep } from "@/lib/agents/runner";
import { hashAgentInput } from "@/lib/agents/input-hash";
import {
  findRecentPlanByHash,
  issueEditTokenForPlan,
} from "@/lib/firestore/plans";
import {
  generateEditToken,
  hashEditToken,
} from "@/lib/plans/edit-token";
import { scorePlanQuality } from "@/lib/agents/plan-quality";
import { PIPELINE_DAG } from "@/lib/agents/registry";
import type { PreviewPlan } from "@/types/preview-plan";
import {
  detectPhase,
  extractIntakeData,
  extractedHasChanges,
  generateConversationalResponse,
  buildPlanSummary,
  buildDetailedPlanContext,
  buildConversationSummary,
  detectContradiction,
  detectRefinementIntent,
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

function getAdminDbSafe() {
  try {
    return getAdminDb();
  } catch (error) {
    console.error("[agent-chat] Admin DB unavailable:", error);
    return null;
  }
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

// SSE utilities — shared with the audit route via lib/sse/create-stream.ts
import { createSSEStream, SSE_HEADERS } from "@/lib/sse/create-stream";

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
      try {
        const input = {
          industry: updatedExtracted.industry ?? "Unknown",
          bottleneck: updatedExtracted.bottleneck ?? "Not specified",
          current_tools: updatedExtracted.current_tools ?? "Not specified",
          urgency: updatedExtracted.urgency,
          volume: updatedExtracted.volume,
          // Pass experiment assignments for prompt A/B testing (5E)
          experimentAssignments: experimentAssignments?.map((a) => ({
            experiment_id: a.experiment_id,
            variant_id: a.variant_key,
            experiment_target: a.target,
            variant_value: (a as unknown as Record<string, unknown>).variant_value as string | undefined,
          })),
        };

        // 3C — plan dedup: compute input hash and check the cache.
        const inputHash = hashAgentInput(input);
        const cached = inputHash
          ? await findRecentPlanByHash(inputHash).catch(() => null)
          : null;

        let plan: PreviewPlan;
        let cachedPlanId: string | undefined;

        if (cached) {
          // ── Cache hit — replay the cached plan via SSE ──
          plan = cached.plan;
          cachedPlanId = cached.id;

          write("message", {
            content:
              "I've already built a Preview Plan for a very similar scenario — let me show you.",
          });

          // Replay each section in the same shape the client expects
          for (const stage of PIPELINE_DAG) {
            const planKey = stage.key === "implementation_sequencer" ? "roadmap"
              : stage.key === "proposal_writer" ? "proposal"
              : stage.key;
            const sectionData = (plan as unknown as Record<string, unknown>)[planKey];
            write("plan_section", {
              section: stage.key,
              label: stage.completeLabel,
              content: sectionData ? JSON.stringify(sectionData) : null,
            });
          }

          // Fire analytics event (server-side)
          const cacheDb = getAdminDbSafe();
          cacheDb?.collection("events").add({
            event_name: "agent_plan_cache_hit",
            payload: {
              input_hash: inputHash,
              cached_plan_id: cached.id,
              source: "agent_chat",
            },
            created_at: new Date(),
          }).catch(() => {});
        } else {
          // ── Cache miss — run the full pipeline ──
          write("message", {
            content:
              "Great, let me build your Preview Plan now. This takes about 30 seconds — I'll show each section as it's ready.",
          });

          const result = await orchestrateAgentPipelineStreaming(
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
          plan = result.plan;
        }

        const db = getAdminDbSafe();

        // Create lead record (non-blocking — don't delay plan delivery)
        const leadWritePromise = db
          ? db.collection("leads").add({
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
            })
          : Promise.resolve(null);

        // Resolve lead write
        const leadRef = await leadWritePromise;
        const leadId = leadRef?.id;

        if (leadId && db) {
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

        // Save plan to Firestore (for shareable URLs).
        // On cache hit we reuse the cached plan's ID instead of creating a
        // duplicate document — the lead still gets linked to it.
        let planId: string | undefined = cachedPlanId;
        let editToken: string | undefined;
        if (planId && db) {
          try {
            editToken = await issueEditTokenForPlan(planId);
          } catch (err) {
            console.error("Failed to mint edit token for cached plan:", err);
          }
        }
        if (!planId && db) {
          try {
            const freshToken = generateEditToken();
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
              input_hash: inputHash || null,
              heuristic_score: scorePlanQuality(plan).score,
              created_at: new Date(),
              view_count: 0,
              is_public: true,
              version: 1,
              versions: [],
              edit_token_hashes: [hashEditToken(freshToken)],
            });
            planId = planRef.id;
            editToken = freshToken;
          } catch (err) {
            console.error("Failed to save plan:", err);
          }
        }

        // Link plan to lead (fire-and-forget)
        if (leadId && planId && db) {
          db.collection("leads").doc(leadId).update({ plan_id: planId }).catch(() => {});
        }

        // Auto-send plan email if we have the visitor's email
        let emailAutoSent = false;
        const extractedEmail = updatedExtracted.email;
        const extractedName = updatedExtracted.name || "";

        if (extractedEmail && plan) {
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

              if (db && leadId) {
                let effectiveLeadId: string = leadId;
                // Dedup: check if another lead already owns this email
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
              }

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
          edit_token: editToken ?? "",
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
      } catch (error) {
        console.error("[agent-chat] Preview plan build failed:", error);
        write("error", {
          message:
            "Preview plan generation is temporarily unavailable. Please try again in a moment.",
          recoverable: true,
        });
        close();
        return;
      }
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

    // 5C — In follow_up phase, detect refinement intent and emit suggestion
    if (nextPhase === "follow_up") {
      const intent = detectRefinementIntent(message);
      if (intent.detected) {
        write("refinement_suggestion", {
          section: intent.sectionHint ?? null,
          feedback: intent.feedback ?? message,
        });
      }
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
    headers: SSE_HEADERS,
  });
}
