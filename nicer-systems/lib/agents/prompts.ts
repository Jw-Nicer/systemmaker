/**
 * Agent Context Assembly — builds prompts from templates + structured context.
 *
 * Handles:
 * - Input sanitization (prevents prompt injection via context values)
 * - Template + context composition
 * - Prompt versioning metadata
 * - Size enforcement (prevents context window overflow)
 *
 * This is the "input guardrail" layer — sanitizing user-provided data
 * before it enters the agent's prompt. One of three guardrail layers
 * (input sanitization, output safety, cross-section coherence).
 */

const MAX_CONTEXT_VALUE_LENGTH = 5000;
const MAX_TOTAL_PROMPT_LENGTH = 100_000;
const PROMPT_INSTRUCTIONS =
  "Respond ONLY with valid JSON matching your Output schema. No markdown fences, no explanation — just the JSON object.";

// ---------------------------------------------------------------------------
// Prompt versioning
// ---------------------------------------------------------------------------

export interface PromptVersion {
  templateKey: string;
  version: string;
  hash: string;
  timestamp: number;
}

/**
 * Compute a simple hash for a template string.
 * Used to track which prompt version produced which output.
 */
function computeTemplateHash(template: string): string {
  let hash = 0;
  for (let i = 0; i < template.length; i++) {
    const char = template.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Extract a version tag from a template's header.
 * Templates can include `<!-- version: 1.2 -->` in their markdown.
 */
function extractVersion(template: string): string {
  const match = template.match(/<!--\s*version:\s*([^\s]+)\s*-->/i);
  return match?.[1] ?? "unversioned";
}

/**
 * Get version metadata for a template.
 */
export function getPromptVersion(
  templateKey: string,
  template: string
): PromptVersion {
  return {
    templateKey,
    version: extractVersion(template),
    hash: computeTemplateHash(template),
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Input sanitization (guardrails)
// ---------------------------------------------------------------------------

/**
 * Sanitize user-provided context values to reduce prompt injection risk.
 * Strips instruction-like markers, markdown section headers, and template syntax.
 */
function sanitizeContextValue(value: string): string {
  return value
    .replace(/(^|\n)\s*(system|assistant|instructions?|ignore previous|forget everything|disregard|override)\s*:/gim, "$1")
    .replace(/^#{1,6}\s/gm, "")
    .replace(/^[-=*]{3,}$/gm, "—")
    .replace(/---+/g, "—")
    .replace(/\$\{[^}]*\}/g, "")
    .replace(/```/g, "'''")
    .slice(0, MAX_CONTEXT_VALUE_LENGTH);
}

/**
 * Sanitize object values for JSON embedding in prompts.
 */
function sanitizeObjectValue(value: unknown): string {
  const json = JSON.stringify(value, null, 2);
  return json
    .replace(/^#{1,6}\s/gm, "")
    .replace(/---+/g, "—")
    .replace(/```/g, "'''")
    .slice(0, MAX_CONTEXT_VALUE_LENGTH);
}

/**
 * Sanitize a context key to prevent markdown injection via keys.
 */
function sanitizeKey(key: string): string {
  return key.replace(/[#*_`~\[\]]/g, "").slice(0, 100);
}

// ---------------------------------------------------------------------------
// Core: assembleAgentContext
// ---------------------------------------------------------------------------

/**
 * Assemble a complete agent prompt from a template and structured context.
 *
 * Structure:
 * 1. Template markdown (agent persona + task description + output schema)
 * 2. Sanitized context from prior stages
 * 3. JSON output instructions
 *
 * The context is sanitized to prevent prompt injection — user-provided
 * values are stripped of instruction markers, markdown headers, and
 * template syntax.
 */
export function assembleAgentContext(
  templateMarkdown: string,
  context: Record<string, unknown>
): string {
  const contextEntries = Object.entries(context).map(([key, value]) => {
    const safeKey = sanitizeKey(key);
    const formatted =
      typeof value === "string"
        ? sanitizeContextValue(value)
        : sanitizeObjectValue(value);
    return `### ${safeKey}\n${formatted}`;
  });

  const promptPrefix = `${templateMarkdown}

---

## Context provided by previous agents

`;

  const promptSuffix = `

---

## Instructions

${PROMPT_INSTRUCTIONS}`;

  const maxContextLength = Math.max(
    0,
    MAX_TOTAL_PROMPT_LENGTH - promptPrefix.length - promptSuffix.length
  );

  let contextBlock = contextEntries.join("\n\n");
  if (contextBlock.length > maxContextLength) {
    contextBlock = contextBlock.slice(0, maxContextLength);
  }

  return `${promptPrefix}${contextBlock}${promptSuffix}`;
}

/** @deprecated Use assembleAgentContext */
export const buildPrompt = assembleAgentContext;
