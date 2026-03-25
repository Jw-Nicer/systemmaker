import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  hasFilledHoneypot,
} from "@/lib/security/request-guards";
import { planRefinementApplySchema } from "@/lib/validation";
import { savePlanRefinement } from "@/lib/firestore/plans";
import type { PlanSectionType } from "@/types/chat";
import {
  mapRefineSectionKeyToPlanSection,
  type RefineSectionKey,
} from "@/lib/plans/refinement";
import { templateOutputSchemas } from "@/lib/agents/schemas";

const SECTION_TO_TEMPLATE_KEY: Record<PlanSectionType, string> = {
  intake: "intake_agent",
  workflow: "workflow_mapper",
  automation: "automation_designer",
  dashboard: "dashboard_designer",
  ops_pulse: "ops_pulse_writer",
  implementation_sequencer: "implementation_sequencer",
};

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, {
      keyPrefix: "agent_refine_apply",
      windowMs: 10 * 60_000,
      maxRequests: 10,
    });
    if (limited) return limited;

    const body = await request.json();
    if (hasFilledHoneypot(body)) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const parsed = planRefinementApplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const { plan_id, section, refined_content, feedback } = parsed.data;

    let planSection: PlanSectionType;
    try {
      planSection = mapRefineSectionKeyToPlanSection(section as RefineSectionKey);
    } catch {
      return NextResponse.json(
        { error: `Invalid section: ${section}` },
        { status: 400 }
      );
    }

    const schema = templateOutputSchemas[SECTION_TO_TEMPLATE_KEY[planSection]];
    if (schema) {
      const validated = schema.safeParse(refined_content);
      if (!validated.success) {
        return NextResponse.json(
          { error: "Invalid refined content" },
          { status: 400 }
        );
      }
    }

    await savePlanRefinement(plan_id, {
      section: planSection,
      content: refined_content,
      feedback,
    });

    return NextResponse.json(
      {
        refined_content,
        section: planSection,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Refine apply request failed", err);
    return NextResponse.json(
      { error: "Failed to save refinement" },
      { status: 500 }
    );
  }
}
