const MAX_CONTEXT_VALUE_LENGTH = 5000;
const MAX_TOTAL_PROMPT_LENGTH = 100_000;
const PROMPT_INSTRUCTIONS =
  "Respond ONLY with valid JSON matching your Output schema. No markdown fences, no explanation — just the JSON object.";

/**
 * Sanitize user-provided context values to reduce prompt injection risk.
 * Strips instruction-like markers, markdown section headers, and template syntax.
 */
function sanitizeContextValue(value: string): string {
  return value
    // Strip instruction-like prefixes only when they form their own prompt-like line
    .replace(/(^|\n)\s*(system|assistant|instructions?|ignore previous|forget everything|disregard|override)\s*:/gim, "$1")
    // Neutralize markdown section headers that could create new prompt sections
    .replace(/^#{1,6}\s/gm, "")
    // Neutralize markdown separators
    .replace(/^[-=*]{3,}$/gm, "—")
    .replace(/---+/g, "—")
    // Neutralize template/interpolation syntax
    .replace(/\$\{[^}]*\}/g, "")
    // Neutralize code fences that could break prompt structure
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

/**
 * Build a system prompt from an agent template + structured context.
 */
export function buildPrompt(
  templateMarkdown: string,
  context: Record<string, unknown>
): string {
  const contextEntries = Object.entries(context)
    .map(([key, value]) => {
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

  const prompt = `${promptPrefix}${contextBlock}${promptSuffix}`;

  return prompt;
}
