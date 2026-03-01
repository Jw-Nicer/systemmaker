export interface EmailStep {
  delay_days: number;
  subject: string;
  body_html: string;
}

export interface EmailSequence {
  id: string;
  name: string;
  trigger: "lead_submit" | "preview_plan_sent";
  steps: EmailStep[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SequenceEnrollment {
  id: string;
  lead_id: string;
  sequence_id: string;
  current_step: number;
  next_send_at: string;
  status: "active" | "completed" | "unsubscribed";
  created_at: string;
  updated_at: string;
}
