/**
 * Shared LLM Client — unified interface for all agent LLM operations.
 *
 * Replaces the 3 separate Gemini client instantiations in runner.ts,
 * refinement.ts, and conversation.ts with a single, observable client.
 *
 * Features:
 * - Singleton Gemini client (avoids re-instantiation)
 * - Unified retry with exponential backoff + jitter
 * - Multi-model fallback cascade
 * - Token budget tracking
 * - Trace context injection (integrates with tracing.ts)
 * - Output size enforcement
 * - Streaming + non-streaming variants
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AgentSpan } from "./tracing";
import { endSpan } from "./tracing";

// ---------------------------------------------------------------------------
// Structured chat types (used by invokeLLMChatStreaming)
// ---------------------------------------------------------------------------

/** A single turn in a Gemini-style structured chat. */
export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

/** Generation tuning passed through to Gemini's generationConfig. */
export interface ChatGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"] as const;
const MAX_RETRIES_PER_MODEL = 2;
const BASE_RETRY_DELAY_MS = 300;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_OUTPUT_BYTES = 512 * 1024; // 512KB

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LLMCallOptions {
  /** Trace span to record metrics on. */
  span?: AgentSpan;
  /** Per-call timeout override (ms). */
  timeoutMs?: number;
  /** Override model cascade for this call. */
  models?: string[];
  /** Max output size in bytes. Default 512KB. */
  maxOutputBytes?: number;
  /** Gemini response MIME type. Default "application/json". */
  responseMimeType?: string;
  /** Label for structured logging. */
  label?: string;
}

export interface LLMCallResult {
  /** Raw text returned by the model. */
  text: string;
  /** Which model actually responded. */
  model: string;
  /** Wall-clock latency of the successful call. */
  latencyMs: number;
  /** Total retry attempts across all models. */
  totalAttempts: number;
}

export interface LLMStreamResult {
  /** Which model actually responded. */
  model: string;
  /** Wall-clock latency when streaming finished. */
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

let _geminiClient: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!_geminiClient) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not set");
    _geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return _geminiClient;
}

// ---------------------------------------------------------------------------
// Token budget tracking
// ---------------------------------------------------------------------------

interface TokenBucketState {
  tokens: number;
  lastRefill: number;
}

const TOKEN_BUCKET_CAPACITY = 60; // requests per minute
const TOKEN_BUCKET_REFILL_RATE = 1; // tokens per second

const _tokenBucket: TokenBucketState = {
  tokens: TOKEN_BUCKET_CAPACITY,
  lastRefill: Date.now(),
};

/** Accumulator for observability. */
export interface LLMUsageStats {
  totalCalls: number;
  totalRetries: number;
  totalLatencyMs: number;
  callsByModel: Record<string, number>;
  failuresByModel: Record<string, number>;
}

const _stats: LLMUsageStats = {
  totalCalls: 0,
  totalRetries: 0,
  totalLatencyMs: 0,
  callsByModel: {},
  failuresByModel: {},
};

export function getLLMUsageStats(): Readonly<LLMUsageStats> {
  return { ..._stats };
}

export function resetLLMUsageStats(): void {
  _stats.totalCalls = 0;
  _stats.totalRetries = 0;
  _stats.totalLatencyMs = 0;
  _stats.callsByModel = {};
  _stats.failuresByModel = {};
}

function refillTokenBucket(): void {
  const now = Date.now();
  const elapsed = (now - _tokenBucket.lastRefill) / 1000;
  _tokenBucket.tokens = Math.min(
    TOKEN_BUCKET_CAPACITY,
    _tokenBucket.tokens + elapsed * TOKEN_BUCKET_REFILL_RATE
  );
  _tokenBucket.lastRefill = now;
}

async function acquireToken(): Promise<void> {
  refillTokenBucket();
  if (_tokenBucket.tokens >= 1) {
    _tokenBucket.tokens -= 1;
    return;
  }
  // Wait until a token is available
  const waitMs = ((1 - _tokenBucket.tokens) / TOKEN_BUCKET_REFILL_RATE) * 1000;
  await sleep(Math.min(waitMs, 5000));
  refillTokenBucket();
  _tokenBucket.tokens = Math.max(0, _tokenBucket.tokens - 1);
}

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

export function isModelAvailabilityError(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase();
  return (
    msg.includes("not found for api version") ||
    msg.includes("is not found") ||
    msg.includes("is not supported") ||
    msg.includes("permission denied")
  );
}

export function isTransientError(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase();
  return /429|500|502|503|504|rate limit|too many requests|quota|deadline exceeded|timed out|timeout|temporarily unavailable|internal error|unavailable|econnreset|network/.test(
    msg
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(attempt: number): number {
  const backoff = BASE_RETRY_DELAY_MS * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 100);
  return backoff + jitter;
}

function getModelCandidates(override?: string[]): string[] {
  if (override && override.length > 0) return override;
  const configuredModel = process.env.GOOGLE_GEMINI_MODEL?.trim();
  if (configuredModel) return [configuredModel];
  return [...DEFAULT_MODELS];
}

/** Strip markdown code fences from LLM output. */
export function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

/** Attempt JSON parse, with fallback to extract outermost object. */
export function robustJsonParse<T>(text: string): T {
  const cleaned = stripCodeFences(text);

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fallback: extract outermost JSON object
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      const extracted = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(extracted) as T;
    }
    throw new Error("Failed to parse LLM output as JSON");
  }
}

// ---------------------------------------------------------------------------
// Core: invokeLLM (non-streaming)
// ---------------------------------------------------------------------------

/**
 * Invoke the LLM with unified retry, model fallback, and observability.
 *
 * This is the single entry point for all non-streaming LLM calls in the
 * agent pipeline. It replaces callGemini() in runner.ts, the retry logic
 * in refinement.ts, and the model selection in conversation.ts.
 */
export async function invokeLLM(
  prompt: string,
  options: LLMCallOptions = {}
): Promise<LLMCallResult> {
  const {
    span,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    models: modelOverride,
    maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
    responseMimeType = "application/json",
    label = "llm_call",
  } = options;

  await acquireToken();

  const client = getClient();
  const models = getModelCandidates(modelOverride);
  let lastError: Error | null = null;
  let totalAttempts = 0;
  const callStart = Date.now();

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      totalAttempts++;
      const attemptStart = Date.now();

      try {
        const geminiModel = client.getGenerativeModel({
          model,
          generationConfig: { responseMimeType },
        });

        const result = await Promise.race([
          geminiModel.generateContent(prompt),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("LLM request timed out")),
              timeoutMs
            )
          ),
        ]);

        const text = result.response.text()?.trim();
        if (!text) {
          throw new Error("Empty response from LLM");
        }
        if (new TextEncoder().encode(text).byteLength > maxOutputBytes) {
          throw new Error("LLM response exceeded size limit");
        }

        const latencyMs = Date.now() - callStart;

        // Record stats
        _stats.totalCalls++;
        _stats.totalRetries += totalAttempts - 1;
        _stats.totalLatencyMs += latencyMs;
        _stats.callsByModel[model] = (_stats.callsByModel[model] ?? 0) + 1;

        // Update span if provided
        if (span) {
          span.model = model;
          span.metadata = {
            ...span.metadata,
            totalAttempts,
            latencyMs,
            label,
          };
        }

        return { text, model, latencyMs, totalAttempts };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        lastError = new Error(
          `LLM invocation failed [${label}] (model=${model}, attempt=${attempt + 1}): ${message}`
        );

        _stats.failuresByModel[model] =
          (_stats.failuresByModel[model] ?? 0) + 1;

        if (isModelAvailabilityError(message)) {
          break; // Skip to next model
        }

        const isTransient = isTransientError(message);
        const hasRetryLeft = attempt < MAX_RETRIES_PER_MODEL;

        if (isTransient && hasRetryLeft) {
          await sleep(getRetryDelayMs(attempt));
          continue;
        }

        break; // Non-transient or out of retries → try next model
      }
    }
  }

  // All models exhausted
  if (span) {
    endSpan(span, {
      status: "failed",
      error: lastError?.message ?? "All models exhausted",
    });
  }

  throw lastError ?? new Error(`LLM invocation failed [${label}]`);
}

// ---------------------------------------------------------------------------
// Core: invokeLLMStreaming
// ---------------------------------------------------------------------------

/**
 * Streaming variant — yields text chunks, returns final metadata.
 *
 * Used by conversation.ts (chat responses) and refinement.ts (section
 * refinement streaming). Unlike invokeLLM, this does NOT retry on failure
 * (streaming retries are complex and rarely worth the UX cost).
 */
export async function* invokeLLMStreaming(
  prompt: string,
  options: LLMCallOptions = {}
): AsyncGenerator<string, LLMStreamResult, unknown> {
  const {
    span,
    models: modelOverride,
    maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
    label = "llm_stream",
  } = options;

  await acquireToken();

  const client = getClient();
  const models = getModelCandidates(modelOverride);
  const model = models[0]; // Streaming uses primary model only
  const callStart = Date.now();

  const geminiModel = client.getGenerativeModel({ model });
  const result = await geminiModel.generateContentStream(prompt);

  let totalBytes = 0;

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      totalBytes += new TextEncoder().encode(text).byteLength;
      if (totalBytes > maxOutputBytes) break;
      yield text;
    }
  }

  const latencyMs = Date.now() - callStart;

  _stats.totalCalls++;
  _stats.totalLatencyMs += latencyMs;
  _stats.callsByModel[model] = (_stats.callsByModel[model] ?? 0) + 1;

  if (span) {
    span.model = model;
    span.metadata = { ...span.metadata, totalBytes, latencyMs, label };
  }

  return { model, latencyMs };
}

// ---------------------------------------------------------------------------
// Core: invokeLLMChatStreaming (structured chat with systemInstruction)
// ---------------------------------------------------------------------------

export interface LLMChatStreamOptions extends LLMCallOptions {
  /** Persistent task framing — model treats this as authoritative grounding. */
  systemInstruction: string;
  /** Conversation turns in chronological order. Last turn should be from "user". */
  contents: ChatTurn[];
  /** Sampling + length controls. */
  generationConfig?: ChatGenerationConfig;
}

/**
 * Streaming chat with proper systemInstruction + structured contents.
 *
 * Internally uses Gemini's `model.startChat({ history })` +
 * `chat.sendMessageStream(text)` instead of bare generateContentStream.
 * Benefits over the previous flat-contents approach:
 *
 *  - **SDK-level history validation** — startChat throws immediately if the
 *    history is malformed (non-alternating roles, leading model turn, etc.)
 *    instead of silently producing weird output downstream.
 *  - **Native chat template** — Gemini handles role formatting consistently
 *    across model versions.
 *  - **Foundation for session pinning (G2)** — the ChatSession object can
 *    later be persisted/restored across requests if we add Firestore-backed
 *    session state.
 *
 * The public signature is unchanged from the previous version: callers
 * still pass `contents` as a single chronological array. Internally we
 * split off the trailing user turn and use it as the new message; the
 * preceding turns become the chat history.
 *
 * Used by conversation.ts for the multi-phase chat agent. Refinement.ts
 * still uses the legacy flat-prompt invokeLLMStreaming.
 */
export async function* invokeLLMChatStreaming(
  options: LLMChatStreamOptions
): AsyncGenerator<string, LLMStreamResult, unknown> {
  const {
    span,
    models: modelOverride,
    maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
    label = "llm_chat_stream",
    systemInstruction,
    contents,
    generationConfig,
  } = options;

  if (!contents || contents.length === 0) {
    throw new Error("invokeLLMChatStreaming requires at least one chat turn");
  }

  // The chatSession API needs the latest user message separately from the
  // accumulated history. The last turn must be from the user.
  const lastTurn = contents[contents.length - 1];
  if (lastTurn.role !== "user") {
    throw new Error(
      `invokeLLMChatStreaming: last turn must be a user message, got "${lastTurn.role}"`
    );
  }
  const history = contents.slice(0, -1).map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));

  await acquireToken();

  const client = getClient();
  const models = getModelCandidates(modelOverride);
  const model = models[0]; // Streaming uses primary model only
  const callStart = Date.now();

  const geminiModel = client.getGenerativeModel({
    model,
    systemInstruction,
    generationConfig,
  });

  // startChat validates the history shape (alternating roles, first turn =
  // user) and throws synchronously on bad input — catches buildChatTurns
  // bugs at the boundary instead of letting them poison the response.
  const chat = geminiModel.startChat({ history });
  const result = await chat.sendMessageStream(lastTurn.text);

  let totalBytes = 0;

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      totalBytes += new TextEncoder().encode(text).byteLength;
      if (totalBytes > maxOutputBytes) break;
      yield text;
    }
  }

  const latencyMs = Date.now() - callStart;

  _stats.totalCalls++;
  _stats.totalLatencyMs += latencyMs;
  _stats.callsByModel[model] = (_stats.callsByModel[model] ?? 0) + 1;

  if (span) {
    span.model = model;
    span.metadata = { ...span.metadata, totalBytes, latencyMs, label };
  }

  return { model, latencyMs };
}

// ---------------------------------------------------------------------------
// Convenience: fast model for simple tasks
// ---------------------------------------------------------------------------

/** Get the fast model name for lightweight tasks (extraction, classification). */
export function getFastModel(): string {
  return "gemini-2.5-flash-lite";
}

/** Get the primary model name for complex reasoning tasks. */
export function getPrimaryModel(): string {
  return process.env.GOOGLE_GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}
