import { NextResponse } from "next/server";
import { agentRunSchema } from "@/lib/validation";
import { runAgentChain, AGENT_STEPS } from "@/lib/agents/runner";
import { getAdminDb } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
      name: "",
      email: "",
      company: "",
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
        completedSteps.push(step);
      }
    );

    return NextResponse.json(
      {
        preview_plan: plan,
        lead_id: leadRef.id,
        steps_completed: AGENT_STEPS.map((s) => s.key),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Agent run error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent chain failed" },
      { status: 500 }
    );
  }
}
