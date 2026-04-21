import { NextResponse } from "next/server";
import { agentRunSchema } from "@/lib/validation";
import { orchestrateAgentPipeline } from "@/lib/agents/runner";
import { savePlan } from "@/lib/firestore/plans";
import { getAdminDb } from "@/lib/firebase/admin";
import { computeLeadScore } from "@/lib/leads/scoring";
import {
  enforceRateLimit,
  hasFilledHoneypot,
} from "@/lib/security/request-guards";
import { buildPublicPlanUrl } from "@/lib/urls";
import type { ExperimentAssignment } from "@/types/experiment";

export async function POST(request: Request) {
  let lastStep: string | null = null;
  try {
    const limited = await enforceRateLimit(request, {
      keyPrefix: "agent_run",
      windowMs: 10 * 60_000,
      maxRequests: 4,
    });
    if (limited) return limited;

    const body = await request.json();
    if (hasFilledHoneypot(body)) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const parsed = agentRunSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const {
      industry,
      bottleneck,
      current_tools,
      urgency,
      volume,
      landing_path,
      experiment_assignments,
    } =
      parsed.data;

    // Create a lead record for this demo interaction
    const db = getAdminDb();
    const leadRef = await db.collection("leads").add({
      industry: (industry ?? "").slice(0, 200),
      bottleneck: (bottleneck ?? "").slice(0, 2000),
      tools: (current_tools ?? "").slice(0, 500),
      urgency: (urgency ?? "").slice(0, 20),
      status: "new",
      source: "agent_demo",
      landing_path: landing_path ?? null,
      experiment_assignments:
        (experiment_assignments as ExperimentAssignment[] | undefined) ?? [],
      score: computeLeadScore({
        email: "",
        company: "",
        bottleneck,
        urgency,
        completed_agent_demo: true,
        preview_plan_sent: false,
      }),
      created_at: new Date(),
    });

    db.collection("events").add({
      event_name: "lead_submit",
      payload: {
        source: "agent_demo",
        landing_path: landing_path ?? null,
        experiment_assignments:
          (experiment_assignments as ExperimentAssignment[] | undefined) ?? [],
      },
      lead_id: leadRef.id,
      created_at: new Date(),
    }).catch(() => {});

    // Run the agent chain
    const completedSteps: string[] = [];
    const { plan } = await orchestrateAgentPipeline(
      { industry, bottleneck, current_tools, urgency, volume },
      (step) => {
        lastStep = step;
        completedSteps.push(step);
      }
    );

    // Store plan in Firestore for shareable URL
    const { id: planId, edit_token: editToken } = await savePlan({
      preview_plan: plan,
      input_summary: {
        industry: industry ?? "",
        bottleneck_summary: (bottleneck ?? "").slice(0, 200),
      },
      lead_id: leadRef.id,
    });
    const shareUrl = buildPublicPlanUrl(request, planId);

    return NextResponse.json(
      {
        preview_plan: plan,
        lead_id: leadRef.id,
        plan_id: planId,
        edit_token: editToken,
        share_url: shareUrl,
        steps_completed: completedSteps,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Agent run error at step:", lastStep, err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
