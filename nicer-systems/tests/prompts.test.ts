import test from "node:test";
import assert from "node:assert/strict";
import { buildPrompt } from "@/lib/agents/prompts";

test("buildPrompt preserves JSON instructions when context is oversized", () => {
  const prompt = buildPrompt("Template header", {
    large_context: "x".repeat(120_000),
  });

  assert.ok(prompt.length <= 100_000);
  assert.match(prompt, /## Instructions/);
  assert.match(prompt, /Respond ONLY with valid JSON matching your Output schema/);
  assert.ok(
    prompt.endsWith(
      "Respond ONLY with valid JSON matching your Output schema. No markdown fences, no explanation — just the JSON object."
    )
  );
});

test("buildPrompt keeps legitimate business terms like inventory system intact", () => {
  const prompt = buildPrompt("Template header", {
    workflow: "Use the inventory system and have the assistant manager review exceptions.",
  });

  assert.match(prompt, /inventory system/);
  assert.match(prompt, /assistant manager/);
});
