import { test } from "vitest";
import assert from "node:assert/strict";

import {
  STAGE_REGISTRY,
  AGENT_STEPS,
  STAGE_KEYS,
  getStageConfig,
  getParallelGroups,
  templateOutputSchemasByTemplateKey,
} from "../lib/agents/registry";

test("STAGE_REGISTRY has 6 stages in pipeline order", () => {
  assert.equal(STAGE_REGISTRY.length, 6);
  assert.deepEqual(STAGE_KEYS, [
    "intake",
    "workflow",
    "automation",
    "dashboard",
    "ops_pulse",
    "implementation_sequencer",
  ]);
});

test("AGENT_STEPS backward-compat export matches registry keys and labels", () => {
  assert.equal(AGENT_STEPS.length, STAGE_REGISTRY.length);
  for (let i = 0; i < AGENT_STEPS.length; i++) {
    assert.equal(AGENT_STEPS[i].key, STAGE_REGISTRY[i].key);
    assert.equal(AGENT_STEPS[i].label, STAGE_REGISTRY[i].label);
  }
});

test("getStageConfig returns correct config for each key", () => {
  const intake = getStageConfig("intake");
  assert.ok(intake);
  assert.equal(intake.templateKey, "intake_agent");
  assert.equal(intake.dependencies.length, 0);

  const workflow = getStageConfig("workflow");
  assert.ok(workflow);
  assert.deepEqual(workflow.dependencies, ["intake"]);

  const opsPulse = getStageConfig("ops_pulse");
  assert.ok(opsPulse);
  assert.deepEqual(opsPulse.dependencies, ["automation", "dashboard"]);
});

test("getStageConfig returns undefined for unknown key", () => {
  // @ts-expect-error — testing invalid key
  const result = getStageConfig("nonexistent");
  assert.equal(result, undefined);
});

test("every stage has a corresponding template output schema", () => {
  for (const stage of STAGE_REGISTRY) {
    const schema = templateOutputSchemasByTemplateKey[stage.templateKey];
    assert.ok(schema, `Missing schema for template key: ${stage.templateKey}`);
  }
});

test("getParallelGroups produces correct execution layers", () => {
  const groups = getParallelGroups();

  // Group 0: intake (no deps)
  assert.equal(groups[0].length, 1);
  assert.equal(groups[0][0].key, "intake");

  // Group 1: workflow (depends on intake)
  assert.equal(groups[1].length, 1);
  assert.equal(groups[1][0].key, "workflow");

  // Group 2: automation + dashboard (both depend on workflow)
  assert.equal(groups[2].length, 2);
  const group2Keys = groups[2].map((s) => s.key).sort();
  assert.deepEqual(group2Keys, ["automation", "dashboard"]);

  // Group 3: ops_pulse + implementation_sequencer (both depend on automation + dashboard)
  assert.equal(groups[3].length, 2);
  const group3Keys = groups[3].map((s) => s.key).sort();
  assert.deepEqual(group3Keys, ["implementation_sequencer", "ops_pulse"]);
});

test("all stages are covered by parallel groups", () => {
  const groups = getParallelGroups();
  const allKeys = groups.flat().map((s) => s.key).sort();
  assert.deepEqual(allKeys, [...STAGE_KEYS].sort());
});

test("no circular dependencies in registry", () => {
  // If getParallelGroups resolves all stages, there are no cycles
  const groups = getParallelGroups();
  const totalStages = groups.reduce((sum, g) => sum + g.length, 0);
  assert.equal(totalStages, STAGE_REGISTRY.length);
});
