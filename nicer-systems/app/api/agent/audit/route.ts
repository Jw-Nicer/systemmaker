import { NextResponse } from "next/server";
import { guidedAuditSchema } from "@/lib/validation";
import {
  orchestrateAgentPipeline,
  orchestrateAgentPipelineStreaming,
  type AgentStep,
} from "@/lib/agents/runner";
import { getAdminDb } from "@/lib/firebase/admin";
import { computeLeadScore } from "@/lib/leads/scoring";
import {
  enforceRateLimit,
  hasFilledHoneypot,
} from "@/lib/security/request-guards";
import {
  buildAuditAgentInput,
  buildAuditLeadSummary,
  buildAuditBottleneckSummary,
} from "@/lib/guided-audit";
import { buildPublicPlanUrl } from "@/lib/urls";
import { hashAgentInput } from "@/lib/agents/input-hash";
import { findRecentPlanByHash } from "@/lib/firestore/plans";
import { scorePlanQuality } from "@/lib/agents/plan-quality";
import { createSSEStream, SSE_HEADERS } from "@/lib/sse/create-stream";
import { PIPELINE_DAG } from "@/lib/agents/registry";
import type { PreviewPlan } from "@/types/preview-plan";
import type { ExperimentAssignment } from "@/types/experiment";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, {
      keyPrefix: "guided_audit",
      windowMs: 10 * 60_000,
      maxRequests: 4,
    });
    if (limited) return limited;

    const body = await request.json();
    if (hasFilledHoneypot(body)) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const parsed = guidedAuditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const input = parsed.data;
    const experimentAssignments =
      (input.experiment_assignments as ExperimentAssignment[] | undefined) ?? [];

    // Check if client wants SSE (2B streaming audit)
    const acceptsSSE =
      request.headers.get("accept")?.includes("text/event-stream") ?? false;

    const leadRef = await db.collection("leads").add({
      name: "",
      email: "",
      company: "",
      industry: input.industry.slice(0, 200),
      bottleneck: buildAuditBottleneckSummary(input).slice(0, 2000),
      tools: input.current_tools.join(", ").slice(0, 500),
      urgency: (input.urgency ?? "").slice(0, 20),
      status: "new",
      source: "guided_audit",
      landing_path: input.landing_path ?? null,
      experiment_assignments: experimentAssignments,
      audit_summary: buildAuditLeadSummary(input),
      audit_responses: input,
      score: computeLeadScore({
        email: "",
        company: "",
        bottleneck: input.bottleneck,
        urgency: input.urgency,
        completed_agent_demo: true,
        preview_plan_sent: false,
      }),
      created_at: new Date(),
    });

    db.collection("events").add({
      event_name: "lead_submit",
      payload: {
        source: "guided_audit",
        landing_path: input.landing_path ?? null,
        experiment_assignments: experimentAssignments,
      },
      lead_id: leadRef.id,
      created_at: new Date(),
    }).catch(() => {});

    const agentInput = {
      ...buildAuditAgentInput(input),
      // Pass experiment assignments for prompt A/B testing (5E)
      experimentAssignments: experimentAssignments.map((a) => ({
        experiment_id: a.experiment_id,
        variant_id: a.variant_key,
        experiment_target: a.target,
        variant_value: (a as unknown as Record<string, unknown>).variant_value as string | undefined,
      })),
    };
    const inputHash = hashAgentInput(agentInput);
    const cached = inputHash
      ? await findRecentPlanByHash(inputHash).catch(() => null)
      : null;

    // ─── SSE streaming path (2B) ──────────────────────────────────
    if (acceptsSSE) {
      const stream = createSSEStream(async (write, close) => {
        let plan: PreviewPlan;

        if (cached) {
          plan = cached.plan;
          // Replay cached sections
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

          db.collection("events").add({
            event_name: "agent_plan_cache_hit",
            payload: { input_hash: inputHash, cached_plan_id: cached.id, source: "guided_audit" },
            created_at: new Date(),
          }).catch(() => {});
        } else {
          const result = await orchestrateAgentPipelineStreaming(
            agentInput,
            (step: AgentStep, label: string, data: unknown) => {
              write("plan_section", {
                section: step,
                label,
                content: data ? JSON.stringify(data) : null,
              });
            },
            (step: AgentStep, errorMsg: string) => {
              write("error", {
                message: `Section "${step}" failed to generate.`,
                section: step,
                recoverable: true,
              });
            }
          );
          plan = result.plan;
        }

        // Save plan
        let planId: string;
        if (cached) {
          planId = cached.id;
          db.collection("plans").doc(cached.id).update({ lead_id: leadRef.id }).catch(() => {});
        } else {
          const planRef = await db.collection("plans").add({
            preview_plan: JSON.parse(JSON.stringify(plan)),
            input_summary: {
              industry: agentInput.industry,
              bottleneck_summary:
                agentInput.bottleneck.length > 100
                  ? agentInput.bottleneck.slice(0, 100) + "..."
                  : agentInput.bottleneck,
            },
            lead_id: leadRef.id,
            input_hash: inputHash || null,
            heuristic_score: scorePlanQuality(plan).score,
            created_at: new Date(),
            view_count: 0,
            is_public: true,
            version: 1,
            versions: [],
          });
          planId = planRef.id;
        }

        await db.collection("leads").doc(leadRef.id).update({
          plan_id: planId,
          updated_at: new Date(),
        });

        write("plan_complete", {
          plan_id: planId,
          lead_id: leadRef.id,
          share_url: buildPublicPlanUrl(request, planId),
          audit_summary: buildAuditLeadSummary(input),
        });

        close();
      });

      return new Response(stream, { headers: SSE_HEADERS });
    }

    // ─── JSON fallback (original behavior) ────────────────────────
    let plan;
    let planRef;

    if (cached) {
      plan = cached.plan;
      planRef = { id: cached.id };
      db.collection("plans").doc(cached.id).update({ lead_id: leadRef.id }).catch(() => {});
      db.collection("events").add({
        event_name: "agent_plan_cache_hit",
        payload: { input_hash: inputHash, cached_plan_id: cached.id, source: "guided_audit" },
        created_at: new Date(),
      }).catch(() => {});
    } else {
      const result = await orchestrateAgentPipeline(agentInput);
      plan = result.plan;
      planRef = await db.collection("plans").add({
        preview_plan: JSON.parse(JSON.stringify(plan)),
        input_summary: {
          industry: agentInput.industry,
          bottleneck_summary:
            agentInput.bottleneck.length > 100
              ? agentInput.bottleneck.slice(0, 100) + "..."
              : agentInput.bottleneck,
        },
        lead_id: leadRef.id,
        input_hash: inputHash || null,
        heuristic_score: scorePlanQuality(plan).score,
        created_at: new Date(),
        view_count: 0,
        is_public: true,
        version: 1,
        versions: [],
      });
    }

    await db.collection("leads").doc(leadRef.id).update({
      plan_id: planRef.id,
      updated_at: new Date(),
    });
    const shareUrl = buildPublicPlanUrl(request, planRef.id);

    return NextResponse.json(
      {
        preview_plan: plan,
        lead_id: leadRef.id,
        plan_id: planRef.id,
        share_url: shareUrl,
        audit_summary: buildAuditLeadSummary(input),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Guided audit error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
