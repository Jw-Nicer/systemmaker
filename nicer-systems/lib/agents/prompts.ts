/**
 * Sanitize user-provided context values to reduce prompt injection risk.
 * Strips instruction-like markers that could override the system prompt.
 */
function sanitizeContextValue(value: string): string {
  return value
    .replace(/^(system|assistant|instructions?|ignore previous|forget everything)[\s:]/gim, "")
    .replace(/---+/g, "—")
    .slice(0, 5000);
}

/**
 * Build a system prompt from an agent template + structured context.
 */
export function buildPrompt(
  templateMarkdown: string,
  context: Record<string, unknown>
): string {
  const contextBlock = Object.entries(context)
    .map(([key, value]) => {
      const formatted =
        typeof value === "string"
          ? sanitizeContextValue(value)
          : JSON.stringify(value, null, 2);
      return `### ${key}\n${formatted}`;
    })
    .join("\n\n");

  return `${templateMarkdown}

---

## Context provided by previous agents

${contextBlock}

---

## Instructions

Respond ONLY with valid JSON matching your Output schema. No markdown fences, no explanation — just the JSON object.`;
}
