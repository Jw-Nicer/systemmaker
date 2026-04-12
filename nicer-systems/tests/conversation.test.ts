import { test, describe } from "vitest";
import assert from "node:assert/strict";
import {
  detectPhase,
  extractHeuristicIntakeData,
  hasRevisionSignal,
  buildChatTurns,
  appendUserTurn,
  buildContextualConversationFallback,
  extractedHasChanges,
} from "@/lib/agents/conversation";
import type { ChatMessage, ExtractedIntake } from "@/types/chat";

function msg(role: "user" | "assistant", content: string, id = role): ChatMessage {
  return { id: `${id}-${Math.random().toString(36).slice(2, 6)}`, role, content, timestamp: Date.now() };
}

test("extractHeuristicIntakeData pulls obvious intake fields from a natural message", () => {
  const extracted = extractHeuristicIntakeData(
    "We run a logistics company. Our biggest problem is manual dispatch updates. We currently use Google Sheets and WhatsApp for about 200 deliveries per day, and this is urgent."
  );

  assert.match(extracted.industry ?? "", /logistics/i);
  assert.match(extracted.bottleneck ?? "", /manual dispatch updates/i);
  assert.match(extracted.current_tools ?? "", /Google Sheets and WhatsApp/i);
  assert.equal(extracted.urgency, "urgent");
  assert.match(extracted.volume ?? "", /200 deliveries per day/i);
});

test("hasRevisionSignal detects correction-style replies", () => {
  assert.equal(
    hasRevisionSignal("Actually, we use HubSpot and QuickBooks, not spreadsheets."),
    true
  );
  assert.equal(hasRevisionSignal("Yes, that sounds right."), false);
});

test("extractHeuristicIntakeData does not treat bare 'using' text as current tools", () => {
  const extracted = extractHeuristicIntakeData(
    "We run a plumbing company using manual follow-up for new leads."
  );

  assert.equal(extracted.current_tools, undefined);
});

test("detectPhase stays in confirming for clarifying questions", () => {
  const phase = detectPhase(
    "confirming",
    {
      industry: "Real estate",
      bottleneck: "Lead follow-up is manual",
      current_tools: "HubSpot and Gmail",
    },
    "What would the first phase of the plan include?"
  );

  assert.equal(phase, "confirming");
});

test("detectPhase returns to gathering when the visitor corrects the summary", () => {
  const phase = detectPhase(
    "confirming",
    {
      industry: "Real estate",
      bottleneck: "Lead follow-up is manual",
      current_tools: "HubSpot and Gmail",
    },
    "Actually, that's not quite right. We use Follow Up Boss and the bottleneck is scheduling."
  );

  assert.equal(phase, "gathering");
});

// ---------------------------------------------------------------------------
// buildChatTurns — structured Gemini contents
// ---------------------------------------------------------------------------

describe("buildChatTurns", () => {
  test("maps assistant role to 'model' and user to 'user'", () => {
    const history = [
      msg("user", "hi"),
      msg("assistant", "hello — what industry are you in?"),
      msg("user", "construction"),
    ];
    const turns = buildChatTurns(history);
    assert.equal(turns.length, 3);
    assert.equal(turns[0].role, "user");
    assert.equal(turns[0].text, "hi");
    assert.equal(turns[1].role, "model");
    assert.equal(turns[2].role, "user");
    assert.equal(turns[2].text, "construction");
  });

  test("skips a leading model turn (Gemini requires first turn = user)", () => {
    const history = [
      msg("assistant", "welcome message that should be dropped"),
      msg("user", "hi there"),
      msg("assistant", "hello"),
    ];
    const turns = buildChatTurns(history);
    assert.equal(turns.length, 2);
    assert.equal(turns[0].role, "user");
    assert.equal(turns[0].text, "hi there");
  });

  test("coalesces consecutive same-role turns", () => {
    const history = [
      msg("user", "first part"),
      msg("user", "second part"),
      msg("assistant", "got it"),
    ];
    const turns = buildChatTurns(history);
    assert.equal(turns.length, 2);
    assert.equal(turns[0].role, "user");
    assert.ok(turns[0].text.includes("first part"));
    assert.ok(turns[0].text.includes("second part"));
  });

  test("drops empty messages", () => {
    const history = [
      msg("user", "hi"),
      msg("assistant", "   "), // whitespace only
      msg("user", "still here"),
    ];
    const turns = buildChatTurns(history);
    // Empty model turn dropped → two user turns coalesce
    assert.equal(turns.length, 1);
    assert.equal(turns[0].role, "user");
    assert.ok(turns[0].text.includes("hi"));
    assert.ok(turns[0].text.includes("still here"));
  });
});

// ---------------------------------------------------------------------------
// appendUserTurn
// ---------------------------------------------------------------------------

describe("appendUserTurn", () => {
  test("pushes a new user turn after a model turn", () => {
    const turns = [
      { role: "user" as const, text: "hi" },
      { role: "model" as const, text: "hello" },
    ];
    const next = appendUserTurn(turns, "what about pricing?");
    assert.equal(next.length, 3);
    assert.equal(next[2].role, "user");
    assert.equal(next[2].text, "what about pricing?");
  });

  test("replaces (does not duplicate) when the latest history turn is the same user message", () => {
    const turns = [
      { role: "user" as const, text: "construction" },
    ];
    const next = appendUserTurn(turns, "construction");
    assert.equal(next.length, 1);
    assert.equal(next[0].text, "construction");
  });

  test("overwrites a stale trailing user turn rather than adding a duplicate user turn", () => {
    const turns = [
      { role: "user" as const, text: "old" },
    ];
    const next = appendUserTurn(turns, "new message");
    assert.equal(next.length, 1);
    assert.equal(next[0].text, "new message");
  });

  test("ignores empty user message", () => {
    const turns = [{ role: "user" as const, text: "hi" }];
    const next = appendUserTurn(turns, "   ");
    assert.deepEqual(next, turns);
  });
});

// ---------------------------------------------------------------------------
// detectPhase — confirming branch (after looksLikeQuestion removal)
// ---------------------------------------------------------------------------

describe("detectPhase confirming behavior post-cleanup", () => {
  const filled = {
    industry: "construction",
    bottleneck: "scheduling",
    current_tools: "spreadsheets",
  };

  test("hedge answers stay in confirming (not building)", () => {
    assert.equal(detectPhase("confirming", filled, "hmm let me think", 4), "confirming");
    assert.equal(detectPhase("confirming", filled, "tell me more first", 4), "confirming");
  });

  test("affirmation goes to building", () => {
    assert.equal(detectPhase("confirming", filled, "yes go ahead", 4), "building");
  });

  test("safety valve at message > 12 still fires", () => {
    assert.equal(detectPhase("confirming", filled, "still thinking", 13), "building");
  });
});

// ---------------------------------------------------------------------------
// buildContextualConversationFallback — recovery from transient stream errors
// ---------------------------------------------------------------------------

describe("buildContextualConversationFallback", () => {
  test("gathering re-asks the next missing field (industry first)", () => {
    const out = buildContextualConversationFallback("gathering", {});
    assert.match(out, /lost the thread/i);
    assert.match(out, /what kind of business/i);
  });

  test("gathering re-asks bottleneck when industry is filled", () => {
    const out = buildContextualConversationFallback("gathering", { industry: "construction" });
    assert.match(out, /main process that's slowing/i);
  });

  test("gathering re-asks current_tools when industry + bottleneck are filled", () => {
    const out = buildContextualConversationFallback("gathering", {
      industry: "construction",
      bottleneck: "scheduling",
    });
    assert.match(out, /what tools/i);
  });

  test("gathering falls back to generic ask when nothing is missing", () => {
    const out = buildContextualConversationFallback("gathering", {
      industry: "construction",
      bottleneck: "scheduling",
      current_tools: "Sheets",
    });
    assert.match(out, /more about your situation/i);
  });

  test("confirming asks about the summary, not a missing field", () => {
    const out = buildContextualConversationFallback("confirming", {
      industry: "construction",
      bottleneck: "scheduling",
      current_tools: "Sheets",
    });
    assert.match(out, /summary/i);
    assert.match(out, /building the plan/i);
  });

  test("follow_up asks the user to repeat their question", () => {
    const out = buildContextualConversationFallback("follow_up", {});
    assert.match(out, /ask that again/i);
  });

  test("never says 'can't access your systems' (that's the safety fallback)", () => {
    const out = buildContextualConversationFallback("gathering", {});
    assert.doesNotMatch(out, /can't access/i);
  });
});

// ---------------------------------------------------------------------------
// extractedHasChanges — diff guard for is_extraction_update echo
// ---------------------------------------------------------------------------

describe("extractedHasChanges", () => {
  const base: ExtractedIntake = {
    industry: "construction",
    bottleneck: "scheduling",
    current_tools: "Sheets",
  };

  test("returns false when both objects are identical", () => {
    assert.equal(extractedHasChanges(base, { ...base }), false);
  });

  test("returns false when both objects are empty", () => {
    assert.equal(extractedHasChanges({}, {}), false);
  });

  test("returns true when a field is added", () => {
    assert.equal(extractedHasChanges(base, { ...base, urgency: "high" }), true);
  });

  test("returns true when a field is changed", () => {
    assert.equal(
      extractedHasChanges(base, { ...base, current_tools: "HubSpot" }),
      true
    );
  });

  test("treats undefined and empty string as equivalent", () => {
    assert.equal(
      extractedHasChanges({ industry: "construction" }, { industry: "construction", bottleneck: "" }),
      false
    );
  });

  test("returns true when a field goes from value to empty", () => {
    assert.equal(
      extractedHasChanges({ ...base, current_tools: "Sheets" }, { ...base, current_tools: "" }),
      true
    );
  });

  test("detects email and name additions", () => {
    assert.equal(
      extractedHasChanges(base, { ...base, email: "x@y.com" }),
      true
    );
    assert.equal(
      extractedHasChanges(base, { ...base, name: "Jane" }),
      true
    );
  });
});
