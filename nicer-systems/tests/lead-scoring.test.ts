import { test, describe } from "vitest";
import assert from "node:assert/strict";
import { computeLeadScore, type LeadScoringInput } from "@/lib/leads/scoring";

describe("computeLeadScore", () => {
  test("empty input returns 0", () => {
    assert.equal(computeLeadScore({}), 0);
  });

  test("email adds 10 points", () => {
    assert.equal(computeLeadScore({ email: "a@b.com" }), 10);
  });

  test("company adds 5 points", () => {
    assert.equal(computeLeadScore({ company: "Acme" }), 5);
  });

  test("short bottleneck (<=20 chars) adds 0", () => {
    assert.equal(computeLeadScore({ bottleneck: "short" }), 0);
  });

  test("bottleneck >20 chars adds 10 points", () => {
    const long = "This bottleneck description is longer than twenty characters";
    assert.equal(computeLeadScore({ bottleneck: long }), 10);
  });

  test("urgency critical adds 20", () => {
    assert.equal(computeLeadScore({ urgency: "critical" }), 20);
  });

  test("urgency high adds 15", () => {
    assert.equal(computeLeadScore({ urgency: "high" }), 15);
  });

  test("urgency medium adds 10", () => {
    assert.equal(computeLeadScore({ urgency: "medium" }), 10);
  });

  test("urgency low adds 5", () => {
    assert.equal(computeLeadScore({ urgency: "low" }), 5);
  });

  test("urgency is case-insensitive", () => {
    assert.equal(computeLeadScore({ urgency: "HIGH" }), 15);
    assert.equal(computeLeadScore({ urgency: "Critical" }), 20);
  });

  test("unknown urgency adds 0", () => {
    assert.equal(computeLeadScore({ urgency: "someday" }), 0);
  });

  test("completed_agent_demo adds 15", () => {
    assert.equal(computeLeadScore({ completed_agent_demo: true }), 15);
  });

  test("completed_agent_demo false adds 0", () => {
    assert.equal(computeLeadScore({ completed_agent_demo: false }), 0);
  });

  test("preview_plan_sent adds 10", () => {
    assert.equal(computeLeadScore({ preview_plan_sent: true }), 10);
  });

  test("utm_source adds 5", () => {
    assert.equal(computeLeadScore({ utm_source: "google" }), 5);
  });

  test("maximum score is 75 (all factors present)", () => {
    const maxLead: LeadScoringInput = {
      email: "test@example.com",
      company: "Acme Corp",
      bottleneck: "Our team spends 20 hours a week on manual data entry and reconciliation",
      urgency: "critical",
      completed_agent_demo: true,
      preview_plan_sent: true,
      utm_source: "linkedin",
    };
    assert.equal(computeLeadScore(maxLead), 75);
  });

  test("partial lead scores correctly (email + company + medium urgency)", () => {
    assert.equal(
      computeLeadScore({ email: "a@b.com", company: "Co", urgency: "medium" }),
      25
    );
  });
});
