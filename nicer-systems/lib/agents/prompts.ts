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
        typeof value === "string" ? value : JSON.stringify(value, null, 2);
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
