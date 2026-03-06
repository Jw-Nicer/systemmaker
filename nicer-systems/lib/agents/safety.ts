import type { ConversationPhase } from "@/types/chat";

export interface SafetyIssue {
  code:
    | "credential_request"
    | "system_access_claim"
    | "impersonation_claim"
    | "secret_leak";
  excerpt: string;
}

const SECRET_PATTERNS = [
  /-----begin [a-z ]*private key-----/i,
  /\bsk-[a-z0-9]{16,}\b/i,
  /\bAIza[0-9A-Za-z\-_]{20,}\b/,
  /\bghp_[0-9A-Za-z]{20,}\b/,
  /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/,
];

const CREDENTIAL_REQUEST_PATTERNS = [
  /\bshare (?:your )?(?:password|passcode|login|credentials?)\b/i,
  /\bsend (?:me )?(?:your )?(?:password|api key|token|secret)\b/i,
  /\bprovide (?:your )?(?:password|credentials?|api key|token|secret)\b/i,
  /\bi need (?:your )?(?:password|credentials?|api key|token|secret)\b/i,
  /\bgive me (?:your )?(?:password|credentials?|api key|token|secret)\b/i,
];

const SYSTEM_ACCESS_CLAIM_PATTERNS = [
  /\bi (?:already )?(?:accessed|logged into|signed into|connected to|reviewed|checked|looked in|pulled from) (?:your|the) /i,
  /\bi can see (?:your|the) /i,
  /\bi found in (?:your|the) /i,
  /\bfrom your (?:crm|database|account|system|workspace|dashboard|inbox)\b/i,
];

const IMPERSONATION_PATTERNS = [
  /\bi am (?:with|from) nicer systems\b/i,
  /\bi work for your (?:company|team)\b/i,
  /\bi'm your (?:employee|dispatcher|manager|assistant)\b/i,
];

function extractExcerpt(text: string, match: RegExpExecArray): string {
  const start = Math.max(0, match.index - 20);
  const end = Math.min(text.length, match.index + match[0].length + 20);
  return text.slice(start, end).trim();
}

function findIssuesForPattern(
  text: string,
  pattern: RegExp,
  code: SafetyIssue["code"]
): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const globalPattern = new RegExp(pattern.source, flags);
  let match: RegExpExecArray | null;

  while ((match = globalPattern.exec(text)) !== null) {
    issues.push({
      code,
      excerpt: extractExcerpt(text, match),
    });
  }

  return issues;
}

export function inspectAgentText(text: string): SafetyIssue[] {
  if (!text.trim()) return [];

  return [
    ...SECRET_PATTERNS.flatMap((pattern) =>
      findIssuesForPattern(text, pattern, "secret_leak")
    ),
    ...CREDENTIAL_REQUEST_PATTERNS.flatMap((pattern) =>
      findIssuesForPattern(text, pattern, "credential_request")
    ),
    ...SYSTEM_ACCESS_CLAIM_PATTERNS.flatMap((pattern) =>
      findIssuesForPattern(text, pattern, "system_access_claim")
    ),
    ...IMPERSONATION_PATTERNS.flatMap((pattern) =>
      findIssuesForPattern(text, pattern, "impersonation_claim")
    ),
  ];
}

export function collectObjectSafetyIssues(value: unknown): SafetyIssue[] {
  if (typeof value === "string") {
    return inspectAgentText(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectObjectSafetyIssues(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => collectObjectSafetyIssues(item));
  }

  return [];
}

export function assertSafeAgentText(text: string, context: string): void {
  const issues = inspectAgentText(text);
  if (issues.length === 0) return;

  throw new Error(
    `Unsafe agent output blocked (${context}): ${issues
      .slice(0, 2)
      .map((issue) => `${issue.code}: ${issue.excerpt}`)
      .join("; ")}`
  );
}

export function assertSafeAgentObject(value: unknown, context: string): void {
  const issues = collectObjectSafetyIssues(value);
  if (issues.length === 0) return;

  throw new Error(
    `Unsafe agent output blocked (${context}): ${issues
      .slice(0, 2)
      .map((issue) => `${issue.code}: ${issue.excerpt}`)
      .join("; ")}`
  );
}

export function buildSafeConversationFallback(
  phase: ConversationPhase
): string {
  switch (phase) {
    case "gathering":
      return "I can help draft a preview plan, but I can't access your systems or handle credentials. What industry are you in, and what's the main process that's slowing your team down?";
    case "confirming":
      return "I can help draft a preview plan, but I can't access your systems or request credentials. If the summary looks right, tell me to build the plan. If not, tell me what to change.";
    case "follow_up":
      return "I can clarify the draft plan, but I can't access your systems or review private credentials. Ask about scope, implementation order, or what to change in the plan.";
    default:
      return "I can help with a draft preview plan, but I can't access your systems or handle credentials.";
  }
}
