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

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

function sseEncode(type: SSEEventType, data: Record<string, unknown>): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

function createSSEStream(
  handler: (
    write: (type: SSEEventType, data: Record<string, unknown>) => void,
    close: () => void
  ) => Promise<void>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

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
        }
      };

      try {
        await handler(write, close);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        write("error", { message });
        close();
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
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
      JSON.stringify({
        error: "Validation failed",
        details: parsed.error.flatten(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { message, history, phase: clientPhase, extracted, plan: clientPlan } = parsed.data;

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
        industry: input.industry,
        bottleneck: input.bottleneck,
        tools: input.current_tools,
        urgency: input.urgency ?? "",
        status: "new",
        source: "agent_chat",
        score: computeLeadScore({
          email: "",
          company: "",
          bottleneck: input.bottleneck,
          urgency: input.urgency,
          completed_agent_demo: true,
          preview_plan_sent: false,
        }),
        created_at: new Date(),
      }).catch((err) => {
        console.error("Failed to create lead:", err);
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
        }
      );

      // Resolve lead write (should be done by now since agent chain took ~30s)
      const leadRef = await leadWritePromise;
      const leadId = leadRef?.id;

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
        share_url: planId ? `/plan/${planId}` : "",
      });

      // Emit phase change to complete
      write("phase_change", { from: "building", to: "complete" });

      // Post-plan message with email capture prompt
      write("message", {
        content:
          "Your Preview Plan is ready! Want me to email it to you? Just share your name and email, and I'll send the full plan to your inbox.",
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
    let fullResponse = "";
    for await (const chunk of generateConversationalResponse(
      nextPhase,
      history as ChatMessage[],
      updatedExtracted,
      message,
      planSummary
    )) {
      fullResponse += chunk;
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
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
