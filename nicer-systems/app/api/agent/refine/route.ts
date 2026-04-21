import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  hasFilledHoneypot,
} from "@/lib/security/request-guards";
import { planRefinementPreviewSchema } from "@/lib/validation";
import { getPlanById } from "@/lib/firestore/plans";
import { refinePlanSection } from "@/lib/agents/refinement";
import type { PlanSectionType } from "@/types/chat";
import type { PreviewPlan } from "@/types/preview-plan";
import {
  mapRefineSectionKeyToPlanSection,
  type RefineSectionKey,
} from "@/lib/plans/refinement";
import { verifyEditToken } from "@/lib/plans/edit-token";
import { requireAdmin } from "@/lib/firebase/auth";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, {
      keyPrefix: "agent_refine",
      windowMs: 10 * 60_000,
      maxRequests: 10,
    });
    if (limited) return limited;

    const body = await request.json();
    if (hasFilledHoneypot(body)) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const parsed = planRefinementPreviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const { plan_id, section, feedback, edit_token } = parsed.data;

    let planSection: PlanSectionType;
    try {
      planSection = mapRefineSectionKeyToPlanSection(section as RefineSectionKey);
    } catch {
      return NextResponse.json(
        { error: `Invalid section: ${section}` },
        { status: 400 }
      );
    }

    // Load the full plan
    const storedPlan = await getPlanById(plan_id);
    if (!storedPlan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Authorize: admin session OR valid per-plan edit token.
    const admin = await requireAdmin();
    const isAdmin = Boolean(admin);
    const tokenOk =
      !!edit_token &&
      verifyEditToken(
        edit_token,
        (storedPlan as { edit_token_hashes?: unknown }).edit_token_hashes
      );
    if (!isAdmin && !tokenOk) {
      return NextResponse.json(
        { error: "Not authorized to refine this plan" },
        { status: 401 }
      );
    }

    const fullPlan: PreviewPlan = storedPlan.preview_plan;

    // Run refinement via Gemini
    const { refined, summary } = await refinePlanSection(
      planSection,
      feedback,
      fullPlan
    );

    // Return preview result as SSE-compatible stream. Persistence happens only
    // after the user explicitly accepts the refined content.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send the refined content as a message event
        controller.enqueue(
          encoder.encode(
            `event: message\ndata: ${JSON.stringify({
              content: JSON.stringify(refined),
              is_chunk: false,
            })}\n\n`
          )
        );

        // Send done event
        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({ summary })}\n\n`
          )
        );

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Refine request failed", err);
    return NextResponse.json(
      { error: "Refinement failed" },
      { status: 500 }
    );
  }
}
