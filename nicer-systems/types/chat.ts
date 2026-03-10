import type { PreviewPlan } from "./preview-plan";
import type { ExperimentAssignment } from "./experiment";

// --- Conversation phases ---

export type ConversationPhase =
  | "gathering"   // Agent asks intake questions one by one
  | "confirming"  // Agent summarizes understanding, asks "Ready to build?"
  | "building"    // Running 5-stage pipeline, streaming sections via SSE
  | "complete"    // Plan delivered, email capture offered
  | "follow_up";  // Visitor asks questions about the plan

// --- Chat messages ---

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  /** Set when the message contains a plan section during building phase */
  plan_section?: PlanSectionType;
  /** Human-readable label for the plan section (e.g. "Bottleneck analysis complete") */
  plan_section_label?: string;
  /** Set when the message is an email capture prompt/response */
  email_capture?: boolean;
}

export type PlanSectionType =
  | "intake"
  | "workflow"
  | "automation"
  | "dashboard"
  | "ops_pulse"
  | "implementation_sequencer";

// --- Conversation state ---

export interface ExtractedIntake {
  industry?: string;
  bottleneck?: string;
  current_tools?: string;
  urgency?: "low" | "medium" | "high" | "urgent";
  volume?: string;
  email?: string;
  name?: string;
}

export interface ConversationState {
  phase: ConversationPhase;
  messages: ChatMessage[];
  extracted: ExtractedIntake;
  plan?: PreviewPlan;
  plan_id?: string;
  lead_id?: string;
  /** Condensed summary of intake for context management */
  intake_summary?: string;
}

// --- SSE event types ---

export type SSEEventType =
  | "message"        // Conversational text from agent
  | "phase_change"   // Transition between conversation phases
  | "plan_section"   // A completed plan section during building
  | "plan_complete"  // All sections done, plan_id available
  | "error"          // Server-side error
  | "done";          // Stream finished

export interface SSEEvent {
  type: SSEEventType;
  data: SSEMessageData | SSEPhaseChangeData | SSEPlanSectionData | SSEPlanCompleteData | SSEErrorData | Record<string, never>;
}

export interface SSEMessageData {
  content: string;
  /** Streaming chunk or full message */
  is_chunk?: boolean;
  extracted?: ExtractedIntake;
  is_extraction_update?: boolean;
  email_capture?: boolean;
}

export interface SSEPhaseChangeData {
  from: ConversationPhase;
  to: ConversationPhase;
}

export interface SSEPlanSectionData {
  section: PlanSectionType;
  label: string;
  content: string | null;
}

export interface SSEPlanCompleteData {
  plan_id: string;
  lead_id?: string;
  share_url: string;
  email_auto_sent?: boolean;
}

export interface SSEErrorData {
  message: string;
  code?: string;
}

// --- API request/response ---

export interface AgentChatRequest {
  message: string;
  conversation_id?: string;
  history: ChatMessage[];
  phase: ConversationPhase;
  extracted: ExtractedIntake;
  landing_path?: string;
  experiment_assignments?: ExperimentAssignment[];
}

// --- Stored plan (Firestore) ---

export interface StoredPlan {
  id: string;
  preview_plan: PreviewPlan;
  input_summary: {
    industry: string;
    bottleneck_summary: string;
  };
  lead_id: string | null;
  created_at: string;
  view_count: number;
  is_public: boolean;
  version: number;
  versions: PlanVersion[];
}

export interface PlanVersion {
  version: number;
  section: PlanSectionType;
  content: string;
  feedback: string;
  created_at: string;
}
