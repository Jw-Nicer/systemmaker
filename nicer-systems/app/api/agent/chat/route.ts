import { getAdminDb } from "@/lib/firebase/admin";
import {
  enforceRateLimit,
  hasFilledHoneypot,
} from "@/lib/security/request-guards";
import { agentChatSchema } from "@/lib/validation";
import { runAgentChainStreaming, type AgentStep } from "@/lib/agents/runner";
import {
  detectPhase,
  extractIntakeData,
  generateConversationalResponse,
  buildPlanSummary,
} from "@/lib/agents/conversation";
import { computeLeadScore } from "@/lib/leads/scoring";
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
    // Step 1: Extract intake data and detect phase
    // Run extraction in parallel with an optimistic phase check
    let updatedExtracted: ExtractedIntake = { ...extracted };

    if (clientPhase === "gathering" || clientPhase === "confirming") {
      // Extraction uses gemini-2.0-flash (fast) — runs quickly
      updatedExtracted = await extractIntakeData(
        history as ChatMessage[],
        message,
        extracted
      );
    }

    // Step 2: Detect the correct phase
    const nextPhase: ConversationPhase = detectPhase(
      clientPhase,
      updatedExtracted,
      message
    );

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
      const plan = await runAgentChainStreaming(
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

      write("plan_complete", {
        plan_id: planId ?? "",
        lead_id: leadId ?? "",
        share_url: planId ? `/plan/${planId}` : "",
      });

      // Emit phase change to complete
      write("phase_change", { from: "building", to: "complete" });

      // Post-plan message with email capture prompt
      write("message", {
        content:
          "Your Preview Plan is ready! Want me to email it to you? Just share your name and email, and I'll send the full plan to your inbox.",
        email_capture: true,
      });

      close();
      return;
    }

    // For conversational phases (gathering, confirming, follow_up):
    // Stream the response token by token
    let planSummary: string | undefined;
    if (nextPhase === "follow_up" && clientPlan && typeof clientPlan === "object") {
      planSummary = buildPlanSummary(
        clientPlan as Parameters<typeof buildPlanSummary>[0]
      );
    }

    // Stream conversational response
    for await (const chunk of generateConversationalResponse(
      nextPhase,
      history as ChatMessage[],
      updatedExtracted,
      message,
      planSummary
    )) {
      write("message", { content: chunk, is_chunk: true });
    }

    // If phase changed to confirming, also send the updated extracted data
    // so the client can store it
    if (nextPhase !== clientPhase || nextPhase === "gathering") {
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
