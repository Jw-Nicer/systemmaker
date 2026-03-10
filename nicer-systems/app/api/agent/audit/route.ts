import { NextResponse } from "next/server";
import { guidedAuditSchema } from "@/lib/validation";
import { runAgentChain } from "@/lib/agents/runner";
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

    const agentInput = buildAuditAgentInput(input);
    const plan = await runAgentChain(agentInput);

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
      created_at: new Date(),
      view_count: 0,
      is_public: true,
      version: 1,
      versions: [],
    });

    await db.collection("leads").doc(leadRef.id).update({
      plan_id: planRef.id,
      updated_at: new Date(),
    });

    return NextResponse.json(
      {
        preview_plan: plan,
        lead_id: leadRef.id,
        plan_id: planRef.id,
        share_url: `/plan/${planRef.id}`,
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
