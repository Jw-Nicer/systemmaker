import { describe, test } from "vitest";
import assert from "node:assert/strict";
import {
  CONVERSATION_RULES,
  getSharedRulesForPhase,
  getRuleById,
  getRuleIdsForPhase,
} from "@/lib/agents/conversation-rules";
import type { ConversationPhase } from "@/types/chat";

describe("CONVERSATION_RULES registry", () => {
  test("every rule has a non-empty id and description", () => {
    for (const r of CONVERSATION_RULES) {
      assert.ok(r.id.length > 0, `rule ${JSON.stringify(r)} has empty id`);
      assert.ok(
        r.description.length > 0,
        `rule ${r.id} has empty description`
      );
    }
  });

  test("every rule id is unique", () => {
    const ids = CONVERSATION_RULES.map((r) => r.id);
    const unique = new Set(ids);
    assert.equal(unique.size, ids.length, "duplicate rule ids in registry");
  });

  test("every rule applies to at least one phase", () => {
    for (const r of CONVERSATION_RULES) {
      assert.ok(
        r.appliesTo.length > 0,
        `rule ${r.id} has empty appliesTo`
      );
    }
  });

  test("every rule's appliesTo entries are valid ConversationPhase values", () => {
    const validPhases: ConversationPhase[] = [
      "gathering",
      "confirming",
      "building",
      "complete",
      "follow_up",
    ];
    for (const r of CONVERSATION_RULES) {
      for (const phase of r.appliesTo) {
        assert.ok(
          validPhases.includes(phase),
          `rule ${r.id} references unknown phase "${phase}"`
        );
      }
    }
  });

  test("every conversational phase has at least one rule", () => {
    for (const phase of ["gathering", "confirming", "follow_up"] as const) {
      const rules = getSharedRulesForPhase(phase);
      assert.ok(
        rules.length > 0,
        `phase "${phase}" has no shared rules in the registry`
      );
    }
  });
});

describe("getSharedRulesForPhase", () => {
  test("returns string array of rule descriptions for gathering", () => {
    const rules = getSharedRulesForPhase("gathering");
    assert.ok(Array.isArray(rules));
    assert.ok(rules.length > 0);
    for (const r of rules) {
      assert.equal(typeof r, "string");
    }
  });

  test("max-sentences-gathering rule fires only in gathering", () => {
    const ids = getRuleIdsForPhase("gathering");
    assert.ok(ids.includes("max-sentences-gathering"));
    assert.ok(!getRuleIdsForPhase("confirming").includes("max-sentences-gathering"));
    assert.ok(!getRuleIdsForPhase("follow_up").includes("max-sentences-gathering"));
  });

  test("max-sentences-confirming rule fires only in confirming", () => {
    const ids = getRuleIdsForPhase("confirming");
    assert.ok(ids.includes("max-sentences-confirming"));
    assert.ok(!getRuleIdsForPhase("gathering").includes("max-sentences-confirming"));
    assert.ok(!getRuleIdsForPhase("follow_up").includes("max-sentences-confirming"));
  });

  test("max-sentences-follow_up rule fires only in follow_up", () => {
    const ids = getRuleIdsForPhase("follow_up");
    assert.ok(ids.includes("max-sentences-follow_up"));
    assert.ok(!getRuleIdsForPhase("gathering").includes("max-sentences-follow_up"));
    assert.ok(!getRuleIdsForPhase("confirming").includes("max-sentences-follow_up"));
  });

  test("no-filler rule applies to all 3 conversational phases", () => {
    for (const phase of ["gathering", "confirming", "follow_up"] as const) {
      const ids = getRuleIdsForPhase(phase);
      assert.ok(
        ids.includes("no-filler"),
        `phase ${phase} missing no-filler rule`
      );
    }
  });

  test("no-markdown-leak rule applies to all 3 conversational phases", () => {
    for (const phase of ["gathering", "confirming", "follow_up"] as const) {
      const ids = getRuleIdsForPhase(phase);
      assert.ok(
        ids.includes("no-markdown-leak"),
        `phase ${phase} missing no-markdown-leak rule`
      );
    }
  });

  test("returns empty array for phases with no shared rules", () => {
    // building and complete don't run conversational responses, so they
    // don't need shared rules.
    assert.deepEqual(getSharedRulesForPhase("building"), []);
    assert.deepEqual(getSharedRulesForPhase("complete"), []);
  });
});

describe("getRuleById", () => {
  test("finds an existing rule", () => {
    const rule = getRuleById("no-filler");
    assert.ok(rule);
    assert.equal(rule!.id, "no-filler");
    assert.match(rule!.description, /Great question/);
  });

  test("returns undefined for unknown id", () => {
    assert.equal(getRuleById("nonexistent-rule"), undefined);
  });
});

describe("getRuleIdsForPhase", () => {
  test("returns rule ids in registry order", () => {
    const ids = getRuleIdsForPhase("gathering");
    // The first gathering-applicable rule in the registry should be first
    // in the returned list. In CONVERSATION_RULES order:
    //   max-sentences-gathering, no-filler, no-markdown-leak
    assert.equal(ids[0], "max-sentences-gathering");
  });

  test("returned list matches getSharedRulesForPhase length", () => {
    for (const phase of ["gathering", "confirming", "follow_up"] as const) {
      const ids = getRuleIdsForPhase(phase);
      const descriptions = getSharedRulesForPhase(phase);
      assert.equal(
        ids.length,
        descriptions.length,
        `phase ${phase} id/description count mismatch`
      );
    }
  });
});
