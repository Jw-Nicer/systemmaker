/**
 * Self-Correction / ReAct Loop — agents that fix their own output.
 *
 * When a stage's output fails schema validation, the error is fed back
 * to the LLM with instructions to fix it. This implements the "reflect
 * and correct" pattern from ReAct-style agentic loops.
 *
 * Key properties:
 * - Max 2 correction attempts (configurable)
 * - Each correction includes the original prompt + error feedback
 * - Corrections are tracked in the trace span
 * - Falls back to throwing if all corrections fail
 */

import type { z } from "zod";
import { invokeLLM, robustJsonParse } from "./llm-client";
import type { LLMCallOptions } from "./llm-client";
import type { AgentSpan } from "./tracing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CorrectionResult<T> {
  /** The validated output. */
  output: T;
  /** Number of correction attempts used (0 = first try succeeded). */
  corrections: number;
  /** Whether the output was auto-fixed via self-correction. */
  wasAutoFixed: boolean;
  /** Which model produced the final output. */
  model: string;
  /** Total latency including corrections. */
  totalLatencyMs: number;
}

export interface SelfCorrectionOptions {
  /** Max correction attempts. Default 2. */
  maxCorrections?: number;
  /** Trace span for observability. */
  span?: AgentSpan;
  /** LLM call options passed through to invokeLLM. */
  llmOptions?: LLMCallOptions;
  /** Label for logging. */
  label?: string;
}

// ---------------------------------------------------------------------------
// Correction prompt builder
// ---------------------------------------------------------------------------

function buildCorrectionPrompt(
  originalPrompt: string,
  previousOutput: string,
  validationErrors: string[],
  attemptNumber: number
): string {
  return `${originalPrompt}

---
## SELF-CORRECTION (attempt ${attemptNumber})

Your previous output failed validation. Here is what went wrong:

### Previous output (INVALID):
${previousOutput.slice(0, 2000)}

### Validation errors:
${validationErrors.map((e, i) => `${i + 1}. ${e}`).join("\n")}

### Instructions:
1. Fix ALL the validation errors listed above.
2. Keep the same structure and intent as your previous output.
3. Return ONLY the corrected JSON. No explanation, no markdown fences.
4. Make sure the output matches the exact schema requirements.`;
}

// ---------------------------------------------------------------------------
// Core: executeWithSelfCorrection
// ---------------------------------------------------------------------------

/**
 * Execute an LLM call with self-correction.
 *
 * Flow:
 * 1. Call LLM with the original prompt
 * 2. Parse and validate the output against the Zod schema
 * 3. If validation fails, build a correction prompt with errors
 * 4. Call LLM again with correction context
 * 5. Repeat up to maxCorrections times
 * 6. If all corrections fail, throw with the last error
 */
export async function executeWithSelfCorrection<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options: SelfCorrectionOptions = {}
): Promise<CorrectionResult<T>> {
  const {
    maxCorrections = 2,
    span,
    llmOptions = {},
    label = "self_correction",
  } = options;

  const totalStart = Date.now();
  let lastOutput = "";
  let lastErrors: string[] = [];

  // Attempt 0: initial call
  const initialResult = await invokeLLM(prompt, {
    ...llmOptions,
    span,
    label: `${label}:initial`,
  });

  lastOutput = initialResult.text;

  // Try to parse and validate
  try {
    const parsed = robustJsonParse<unknown>(lastOutput);
    const validated = schema.safeParse(parsed);

    if (validated.success) {
      return {
        output: validated.data,
        corrections: 0,
        wasAutoFixed: false,
        model: initialResult.model,
        totalLatencyMs: Date.now() - totalStart,
      };
    }

    // Validation failed — extract errors
    lastErrors = validated.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
  } catch (err) {
    lastErrors = [
      `JSON parse failed: ${err instanceof Error ? err.message : "Unknown parse error"}`,
    ];
  }

  // Correction loop
  for (let attempt = 1; attempt <= maxCorrections; attempt++) {
    const correctionPrompt = buildCorrectionPrompt(
      prompt,
      lastOutput,
      lastErrors,
      attempt
    );

    try {
      const correctionResult = await invokeLLM(correctionPrompt, {
        ...llmOptions,
        span,
        label: `${label}:correction_${attempt}`,
      });

      lastOutput = correctionResult.text;
      const parsed = robustJsonParse<unknown>(lastOutput);
      const validated = schema.safeParse(parsed);

      if (validated.success) {
        // Update span with correction count
        if (span) {
          span.corrections = attempt;
          span.metadata = {
            ...span.metadata,
            selfCorrected: true,
            correctionAttempts: attempt,
          };
        }

        console.log(
          `[self-correction] ${label} succeeded after ${attempt} correction(s)`
        );

        return {
          output: validated.data,
          corrections: attempt,
          wasAutoFixed: true,
          model: correctionResult.model,
          totalLatencyMs: Date.now() - totalStart,
        };
      }

      // Still failing — update errors for next attempt
      lastErrors = validated.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
    } catch (err) {
      lastErrors = [
        `Correction attempt ${attempt} failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      ];
    }
  }

  // All corrections exhausted
  if (span) {
    span.corrections = maxCorrections;
    span.metadata = {
      ...span.metadata,
      selfCorrected: false,
      correctionAttempts: maxCorrections,
      lastErrors,
    };
  }

  throw new Error(
    `Self-correction exhausted for ${label} after ${maxCorrections} attempts. ` +
      `Last errors: ${lastErrors.join("; ")}`
  );
}

// ---------------------------------------------------------------------------
// Convenience: executeStageWithCorrection
// ---------------------------------------------------------------------------

/**
 * Execute a pipeline stage with self-correction enabled.
 * This is the standard way to run a stage in the DAG executor.
 */
export async function executeStageWithCorrection<T>(
  templateKey: string,
  prompt: string,
  schema: z.ZodType<T>,
  options: {
    span?: AgentSpan;
    timeoutMs?: number;
    maxCorrections?: number;
  } = {}
): Promise<CorrectionResult<T>> {
  return executeWithSelfCorrection(prompt, schema, {
    maxCorrections: options.maxCorrections ?? 2,
    span: options.span,
    llmOptions: {
      timeoutMs: options.timeoutMs,
      label: templateKey,
    },
    label: templateKey,
  });
}
