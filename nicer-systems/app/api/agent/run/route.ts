import { NextResponse } from "next/server";
import { agentRunSchema } from "@/lib/validation";
import { runAgentChain } from "@/lib/agents/runner";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  enforceRateLimit,
  hasFilledHoneypot,
} from "@/lib/security/request-guards";

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
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { industry, bottleneck, current_tools, urgency, volume } =
      parsed.data;

    // Create a lead record for this demo interaction
    const db = getAdminDb();
    const leadRef = await db.collection("leads").add({
      industry,
      bottleneck,
      tools: current_tools,
      urgency: urgency ?? "",
      status: "new",
      source: "agent_demo",
      created_at: new Date(),
    });

    // Run the agent chain
    const completedSteps: string[] = [];
    const plan = await runAgentChain(
      { industry, bottleneck, current_tools, urgency, volume },
      (step) => {
        lastStep = step;
        completedSteps.push(step);
      }
    );

    return NextResponse.json(
      {
        preview_plan: plan,
        lead_id: leadRef.id,
        steps_completed: completedSteps,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Agent run error:", err);
    return NextResponse.json(
      {
        error: "Agent chain failed",
        failed_step: lastStep,
      },
      { status: 500 }
    );
  }
}
