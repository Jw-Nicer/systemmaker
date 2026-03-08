import test from "node:test";
import assert from "node:assert/strict";
import {
  detectPhase,
  extractHeuristicIntakeData,
  hasRevisionSignal,
} from "@/lib/agents/conversation";

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
