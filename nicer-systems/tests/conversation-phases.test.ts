import { describe, test } from "vitest";
import assert from "node:assert/strict";
import {
  extractHeuristicIntakeData,
  detectPhase,
  hasRevisionSignal,
  missingFields,
} from "@/lib/agents/conversation";
import type { ExtractedIntake } from "@/types/chat";

// ---------------------------------------------------------------------------
// extractHeuristicIntakeData — industry extraction
// ---------------------------------------------------------------------------

describe("extractHeuristicIntakeData — industry", () => {
  test("matches bare industry names", () => {
    assert.equal(extractHeuristicIntakeData("Construction").industry, "Construction");
    assert.equal(extractHeuristicIntakeData("healthcare").industry, "healthcare");
    assert.equal(extractHeuristicIntakeData("Legal").industry, "Legal");
    assert.equal(extractHeuristicIntakeData("staffing").industry, "staffing");
    assert.equal(extractHeuristicIntakeData("plumbing").industry, "plumbing");
    assert.equal(extractHeuristicIntakeData("property management").industry, "property management");
  });

  test("matches 'I run a ...' patterns", () => {
    const result = extractHeuristicIntakeData("I run a landscaping company");
    assert.equal(result.industry, "landscaping");
  });

  test("matches 'we are in ...' patterns", () => {
    const result = extractHeuristicIntakeData("We're in real estate");
    assert.equal(result.industry, "real estate");
  });

  test("returns undefined for non-industry input", () => {
    assert.equal(extractHeuristicIntakeData("hello").industry, undefined);
    assert.equal(extractHeuristicIntakeData("I need help").industry, undefined);
  });

  // ── Conversational openers with sizing prefix (Tier 2E) ────────────────

  test("matches 'we're a 30-person property management shop'", () => {
    const result = extractHeuristicIntakeData("we're a 30-person property management shop");
    assert.equal(result.industry, "property management");
  });

  test("matches 'I'm a small healthcare clinic'", () => {
    const result = extractHeuristicIntakeData("I'm a small healthcare clinic");
    assert.equal(result.industry, "healthcare");
  });

  test("matches 'we are a 5-person legal firm'", () => {
    const result = extractHeuristicIntakeData("we are a 5-person legal firm");
    assert.equal(result.industry, "legal");
  });

  test("matches 'we're a mid-sized construction company'", () => {
    const result = extractHeuristicIntakeData("we're a mid-sized construction company");
    assert.equal(result.industry, "construction");
  });

  test("matches 'I am a tiny landscaping business'", () => {
    const result = extractHeuristicIntakeData("I am a tiny landscaping business");
    assert.equal(result.industry, "landscaping");
  });

  test("matches 'we're a growing dental practice'", () => {
    const result = extractHeuristicIntakeData("we're a growing dental practice");
    assert.equal(result.industry, "dental");
  });

  test("does not falsely capture from 'we're using HubSpot at the moment'", () => {
    // Negative case — the negative-words guard should reject "using HubSpot"
    // before it reaches a captured industry value.
    const result = extractHeuristicIntakeData("we're using HubSpot at the moment");
    assert.equal(result.industry, undefined);
  });
});

// ---------------------------------------------------------------------------
// extractHeuristicIntakeData — bottleneck extraction
// ---------------------------------------------------------------------------

describe("extractHeuristicIntakeData — bottleneck", () => {
  test("extracts explicit bottleneck descriptions", () => {
    const result = extractHeuristicIntakeData("Our bottleneck is scheduling jobs across 3 teams");
    assert.ok(result.bottleneck);
    assert.ok(result.bottleneck!.includes("scheduling"));
  });

  test("extracts conversational problem descriptions", () => {
    const result = extractHeuristicIntakeData("We keep hitting delays because everything is manual and we lose time tracking spreadsheets");
    assert.ok(result.bottleneck);
  });

  test("returns undefined for generic text", () => {
    assert.equal(extractHeuristicIntakeData("hi there").bottleneck, undefined);
  });

  // ── Tightened conversational branch (Tier 2E) ──────────────────────────
  // The pre-2E version would over-fire on long messages that contained ANY
  // problem keyword. The new logic requires both a problem-pattern AND a
  // problem-keyword.

  test("does NOT fire on long messages with a keyword but no problem pattern", () => {
    const result = extractHeuristicIntakeData(
      "I'd love to learn how the manual review process works for new client onboarding"
    );
    assert.equal(result.bottleneck, undefined);
  });

  test("does NOT fire on a casual mention of spreadsheets", () => {
    const result = extractHeuristicIntakeData(
      "Our team uses spreadsheets for everything and that has worked fine for years honestly"
    );
    assert.equal(result.bottleneck, undefined);
  });

  test("DOES fire when both pattern and keyword are present", () => {
    const result = extractHeuristicIntakeData(
      "the process is broken and we keep losing track of follow-ups"
    );
    assert.ok(result.bottleneck);
  });

  test("DOES fire on 'we lose time' + 'manual' combination", () => {
    const result = extractHeuristicIntakeData(
      "we lose time every week chasing manual updates from the field crews"
    );
    assert.ok(result.bottleneck);
  });
});

// ---------------------------------------------------------------------------
// extractHeuristicIntakeData — other fields
// ---------------------------------------------------------------------------

describe("extractHeuristicIntakeData — tools, urgency, email", () => {
  test("extracts current tools", () => {
    const result = extractHeuristicIntakeData("We currently use Google Sheets and Slack");
    assert.ok(result.current_tools);
    assert.ok(result.current_tools!.includes("Google Sheets"));
  });

  test("extracts urgency levels", () => {
    assert.equal(extractHeuristicIntakeData("This is urgent").urgency, "urgent");
    assert.equal(extractHeuristicIntakeData("High priority for us").urgency, "high");
    assert.equal(extractHeuristicIntakeData("We're exploring options").urgency, "low");
  });

  test("extracts email addresses", () => {
    const result = extractHeuristicIntakeData("You can reach me at john@example.com");
    assert.equal(result.email, "john@example.com");
  });

  test("extracts volume", () => {
    const result = extractHeuristicIntakeData("We handle about 200 orders per week");
    assert.ok(result.volume);
    assert.ok(result.volume!.includes("200"));
  });
});

// ---------------------------------------------------------------------------
// detectPhase — state machine
// ---------------------------------------------------------------------------

describe("detectPhase", () => {
  const empty: ExtractedIntake = {
    industry: undefined,
    bottleneck: undefined,
    current_tools: undefined,
    urgency: undefined,
    volume: undefined,
    email: undefined,
    name: undefined,
  };

  const partial: ExtractedIntake = {
    ...empty,
    industry: "Construction",
  };

  const complete: ExtractedIntake = {
    ...empty,
    industry: "Construction",
    bottleneck: "Manual scheduling",
    current_tools: "Google Sheets",
  };

  test("stays in gathering when fields are missing", () => {
    assert.equal(detectPhase("gathering", empty, "hello", 1), "gathering");
    assert.equal(detectPhase("gathering", partial, "our bottleneck is scheduling", 2), "gathering");
  });

  test("moves to confirming when all required fields filled", () => {
    assert.equal(detectPhase("gathering", complete, "some message", 3), "confirming");
  });

  test("safety valve: moves to confirming after 8+ messages with 1+ field", () => {
    assert.equal(detectPhase("gathering", partial, "some message", 8), "confirming");
    // But NOT with zero fields
    assert.equal(detectPhase("gathering", empty, "some message", 8), "gathering");
  });

  test("confirming → building on affirmation", () => {
    assert.equal(detectPhase("confirming", complete, "yes", 4), "building");
    assert.equal(detectPhase("confirming", complete, "looks good", 4), "building");
    assert.equal(detectPhase("confirming", complete, "let's go", 4), "building");
    assert.equal(detectPhase("confirming", complete, "sounds good", 4), "building");
  });

  test("confirming → gathering on revision signal", () => {
    assert.equal(detectPhase("confirming", complete, "no, wait", 4), "gathering");
    assert.equal(detectPhase("confirming", complete, "that's wrong", 4), "gathering");
  });

  test("building never goes back", () => {
    assert.equal(detectPhase("building", complete, "stop", 10), "building");
    assert.equal(detectPhase("building", empty, "go back", 10), "building");
  });

  test("complete/follow_up stays in follow_up", () => {
    assert.equal(detectPhase("complete", complete, "thanks", 5), "follow_up");
    assert.equal(detectPhase("follow_up", complete, "what about X?", 6), "follow_up");
  });
});

// ---------------------------------------------------------------------------
// hasRevisionSignal
// ---------------------------------------------------------------------------

describe("hasRevisionSignal", () => {
  test("detects revision signals", () => {
    assert.ok(hasRevisionSignal("No, that's not right"));
    assert.ok(hasRevisionSignal("Wait, let me change that"));
    assert.ok(hasRevisionSignal("That's wrong"));
    assert.ok(hasRevisionSignal("Not quite"));
  });

  test("does not flag normal messages", () => {
    assert.ok(!hasRevisionSignal("yes looks good"));
    assert.ok(!hasRevisionSignal("sounds great"));
  });
});

// ---------------------------------------------------------------------------
// missingFields
// ---------------------------------------------------------------------------

describe("missingFields", () => {
  test("returns all required fields when empty", () => {
    const missing = missingFields({
      industry: undefined,
      bottleneck: undefined,
      current_tools: undefined,
    } as ExtractedIntake);
    assert.ok(missing.includes("industry"));
    assert.ok(missing.includes("bottleneck"));
    assert.ok(missing.includes("current_tools"));
  });

  test("returns empty array when all filled", () => {
    const missing = missingFields({
      industry: "Construction",
      bottleneck: "Scheduling",
      current_tools: "Sheets",
    } as ExtractedIntake);
    assert.equal(missing.length, 0);
  });

  test("treats empty string as missing", () => {
    const missing = missingFields({
      industry: "Construction",
      bottleneck: "",
      current_tools: "Sheets",
    } as ExtractedIntake);
    assert.deepEqual(missing, ["bottleneck"]);
  });
});
