export interface AnalyticsEventRecord {
  id: string;
  event_name: string;
  payload?: Record<string, unknown>;
  lead_id?: string | null;
  created_at?: string;
}

export interface AnalyticsLeadRecord {
  id: string;
  source?: string;
  utm_source?: string;
  landing_path?: string;
  created_at?: string;
}

export interface FunnelSummary {
  landingViews: number;
  previewStarts: number;
  previewCompleted: number;
  leadsSubmitted: number;
  bookingClicks: number;
  sharedPlanViews: number;
  planShares: number;
  previewCompletionRate: number;
  leadConversionRate: number;
  bookingClickRate: number;
}

export interface LandingPathSummary {
  path: string;
  views: number;
  leads: number;
  conversionRate: number;
}

export interface LeadSourceSummary {
  source: string;
  leads: number;
}

export interface DashboardAnalytics {
  windowDays: number;
  funnel: FunnelSummary;
  topLandingPaths: LandingPathSummary[];
  leadSources: LeadSourceSummary[];
}

export interface ExperimentVariantExposureSummary {
  key: string;
  label: string;
  exposures: number;
  share: number;
  leads: number;
  bookings: number;
  leadConversionRate: number;
  bookingRate: number;
}

export interface ExperimentExposureSummary {
  experimentId: string;
  experimentName: string;
  target: string;
  exposures: number;
  leads: number;
  bookings: number;
  leadConversionRate: number;
  bookingRate: number;
  lastSeen: string | null;
  variants: ExperimentVariantExposureSummary[];
}
