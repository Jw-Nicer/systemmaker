import { EVENTS } from "@/lib/analytics";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeDoc } from "@/lib/firestore/serialize";
import type {
  AnalyticsEventRecord,
  AnalyticsLeadRecord,
  DashboardAnalytics,
  ExperimentExposureSummary,
  FunnelSummary,
  LandingPathSummary,
  LeadSourceSummary,
} from "@/types/analytics";
import type { ExperimentAssignment } from "@/types/experiment";

const MAX_EVENT_DOCS = 2500;
const MAX_LEAD_DOCS = 1000;

const PREVIEW_START_EVENTS = new Set<string>([
  EVENTS.AGENT_DEMO_START,
  EVENTS.AGENT_CHAT_START,
]);

const PREVIEW_COMPLETE_EVENTS = new Set<string>([
  EVENTS.AGENT_DEMO_COMPLETE,
  EVENTS.AGENT_CHAT_PLAN_COMPLETE,
]);

const BOOKING_CLICK_EVENTS = new Set<string>([
  EVENTS.BOOKING_CLICK,
  EVENTS.CTA_CLICK_BOOK,
]);

const PLAN_SHARE_EVENTS = new Set<string>([
  EVENTS.PLAN_SHARED_COPY_LINK,
  EVENTS.PLAN_SHARED_EMAIL,
  EVENTS.PLAN_SHARED_LINKEDIN,
]);

export const EMPTY_DASHBOARD_ANALYTICS: DashboardAnalytics = {
  windowDays: 30,
  funnel: {
    landingViews: 0,
    previewStarts: 0,
    previewCompleted: 0,
    leadsSubmitted: 0,
    bookingClicks: 0,
    sharedPlanViews: 0,
    planShares: 0,
    previewCompletionRate: 0,
    leadConversionRate: 0,
    bookingClickRate: 0,
  },
  topLandingPaths: [],
  leadSources: [],
};

function toDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinWindow(value: string | undefined, since: Date) {
  const date = toDate(value);
  return date ? date >= since : false;
}

function coerceNonEmptyString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toPercent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function incrementCount(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function countEvents(events: AnalyticsEventRecord[], names: Set<string> | string) {
  if (typeof names === "string") {
    return events.filter((event) => event.event_name === names).length;
  }

  return events.filter((event) => names.has(event.event_name)).length;
}

function sortByCountDesc<T extends { exposures?: number; leads?: number; views?: number }>(
  items: T[]
) {
  return items.sort((a, b) => {
    const aValue = a.exposures ?? a.leads ?? a.views ?? 0;
    const bValue = b.exposures ?? b.leads ?? b.views ?? 0;
    return bValue - aValue;
  });
}

function getExperimentAssignmentsFromPayload(
  payload: Record<string, unknown> | undefined
): ExperimentAssignment[] {
  const assignments = payload?.experiment_assignments;
  if (!Array.isArray(assignments)) return [];

  return assignments.flatMap((assignment) => {
    if (!assignment || typeof assignment !== "object") return [];
    const candidate = assignment as Record<string, unknown>;

    if (
      typeof candidate.experiment_id !== "string" ||
      typeof candidate.experiment_name !== "string" ||
      typeof candidate.target !== "string" ||
      typeof candidate.variant_key !== "string" ||
      typeof candidate.variant_label !== "string"
    ) {
      return [];
    }

    return [candidate as unknown as ExperimentAssignment];
  });
}

function summarizeLandingPaths(
  events: AnalyticsEventRecord[],
  leads: AnalyticsLeadRecord[]
): LandingPathSummary[] {
  const viewsByPath = new Map<string, number>();
  const leadsByPath = new Map<string, number>();

  for (const event of events) {
    if (event.event_name !== EVENTS.LANDING_VIEW) continue;
    const path = coerceNonEmptyString(event.payload?.landing_path) ?? "/";
    incrementCount(viewsByPath, path);
  }

  for (const lead of leads) {
    const path = coerceNonEmptyString(lead.landing_path);
    if (!path) continue;
    incrementCount(leadsByPath, path);
  }

  const allPaths = new Set([...viewsByPath.keys(), ...leadsByPath.keys()]);
  const summaries = [...allPaths].map((path) => {
    const views = viewsByPath.get(path) ?? 0;
    const leadCount = leadsByPath.get(path) ?? 0;
    return {
      path,
      views,
      leads: leadCount,
      conversionRate: toPercent(leadCount, views),
    };
  });

  return sortByCountDesc(summaries).slice(0, 5);
}

function summarizeLeadSources(leads: AnalyticsLeadRecord[]): LeadSourceSummary[] {
  const counts = new Map<string, number>();

  for (const lead of leads) {
    const source =
      coerceNonEmptyString(lead.utm_source) ??
      coerceNonEmptyString(lead.source) ??
      "direct";
    incrementCount(counts, source);
  }

  return sortByCountDesc(
    [...counts.entries()].map(([source, leadCount]) => ({
      source,
      leads: leadCount,
    }))
  ).slice(0, 5);
}

export function buildDashboardAnalytics(
  events: AnalyticsEventRecord[],
  leads: AnalyticsLeadRecord[],
  windowDays = 30
): DashboardAnalytics {
  const funnel: FunnelSummary = {
    landingViews: countEvents(events, EVENTS.LANDING_VIEW),
    previewStarts: countEvents(events, PREVIEW_START_EVENTS),
    previewCompleted: countEvents(events, PREVIEW_COMPLETE_EVENTS),
    leadsSubmitted: countEvents(events, EVENTS.LEAD_SUBMIT),
    bookingClicks: countEvents(events, BOOKING_CLICK_EVENTS),
    sharedPlanViews: countEvents(events, EVENTS.PLAN_VIEW_SHARED),
    planShares: countEvents(events, PLAN_SHARE_EVENTS),
    previewCompletionRate: 0,
    leadConversionRate: 0,
    bookingClickRate: 0,
  };

  funnel.previewCompletionRate = toPercent(
    funnel.previewCompleted,
    funnel.previewStarts
  );
  funnel.leadConversionRate = toPercent(
    funnel.leadsSubmitted,
    funnel.landingViews
  );
  funnel.bookingClickRate = toPercent(
    funnel.bookingClicks,
    funnel.leadsSubmitted
  );

  return {
    windowDays,
    funnel,
    topLandingPaths: summarizeLandingPaths(events, leads),
    leadSources: summarizeLeadSources(leads),
  };
}

export function buildExperimentExposureSummaries(
  events: AnalyticsEventRecord[]
): Record<string, ExperimentExposureSummary> {
  const summaries = new Map<string, ExperimentExposureSummary>();

  for (const event of events) {
    if (event.event_name !== EVENTS.LANDING_EXPERIMENT_EXPOSURE) continue;

    const experimentId = coerceNonEmptyString(event.payload?.experiment_id);
    const experimentName =
      coerceNonEmptyString(event.payload?.experiment_name) ?? "Unnamed experiment";
    const target = coerceNonEmptyString(event.payload?.target) ?? "unknown";
    const variantKey = coerceNonEmptyString(event.payload?.variant_key) ?? "unknown";
    const variantLabel =
      coerceNonEmptyString(event.payload?.variant_label) ?? variantKey;

    if (!experimentId) continue;

    let summary = summaries.get(experimentId);
    if (!summary) {
      summary = {
        experimentId,
        experimentName,
        target,
        exposures: 0,
        leads: 0,
        bookings: 0,
        leadConversionRate: 0,
        bookingRate: 0,
        lastSeen: null,
        variants: [],
      };
      summaries.set(experimentId, summary);
    }

    summary.exposures += 1;

    const eventDate = toDate(event.created_at);
    if (eventDate) {
      const lastSeen = toDate(summary.lastSeen ?? undefined);
      if (!lastSeen || eventDate > lastSeen) {
        summary.lastSeen = eventDate.toISOString();
      }
    }

    const existingVariant = summary.variants.find(
      (variant) => variant.key === variantKey
    );

    if (existingVariant) {
      existingVariant.exposures += 1;
    } else {
      summary.variants.push({
        key: variantKey,
        label: variantLabel,
        exposures: 1,
        share: 0,
        leads: 0,
        bookings: 0,
        leadConversionRate: 0,
        bookingRate: 0,
      });
    }
  }

  for (const event of events) {
    if (
      event.event_name !== EVENTS.LEAD_SUBMIT &&
      !BOOKING_CLICK_EVENTS.has(event.event_name)
    ) {
      continue;
    }

    const assignments = getExperimentAssignmentsFromPayload(event.payload);
    for (const assignment of assignments) {
      const summary = summaries.get(assignment.experiment_id);
      if (!summary) continue;

      const variant = summary.variants.find(
        (item) => item.key === assignment.variant_key
      );
      if (!variant) continue;

      if (event.event_name === EVENTS.LEAD_SUBMIT) {
        summary.leads += 1;
        variant.leads += 1;
      } else {
        summary.bookings += 1;
        variant.bookings += 1;
      }
    }
  }

  for (const summary of summaries.values()) {
    summary.variants = sortByCountDesc(summary.variants).map((variant) => ({
      ...variant,
      share: toPercent(variant.exposures, summary.exposures),
      leadConversionRate: toPercent(variant.leads, variant.exposures),
      bookingRate: toPercent(variant.bookings, variant.exposures),
    }));
    summary.leadConversionRate = toPercent(summary.leads, summary.exposures);
    summary.bookingRate = toPercent(summary.bookings, summary.exposures);
  }

  return Object.fromEntries(summaries.entries());
}

export async function getDashboardAnalytics(
  windowDays = 30
): Promise<DashboardAnalytics> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const db = getAdminDb();

  const [eventSnap, leadSnap] = await Promise.all([
    db.collection("events").orderBy("created_at", "desc").limit(MAX_EVENT_DOCS).get(),
    db.collection("leads").orderBy("created_at", "desc").limit(MAX_LEAD_DOCS).get(),
  ]);

  const events = eventSnap.docs
    .map((doc) => serializeDoc<AnalyticsEventRecord>(doc))
    .filter((event) => isWithinWindow(event.created_at, since));

  const leads = leadSnap.docs
    .map((doc) => serializeDoc<AnalyticsLeadRecord>(doc))
    .filter((lead) => isWithinWindow(lead.created_at, since));

  return buildDashboardAnalytics(events, leads, windowDays);
}

export async function getExperimentExposureSummaries(
  windowDays = 30
): Promise<Record<string, ExperimentExposureSummary>> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const db = getAdminDb();

  const eventSnap = await db
    .collection("events")
    .orderBy("created_at", "desc")
    .limit(MAX_EVENT_DOCS)
    .get();

  const events = eventSnap.docs
    .map((doc) => serializeDoc<AnalyticsEventRecord>(doc))
    .filter((event) => isWithinWindow(event.created_at, since));

  return buildExperimentExposureSummaries(events);
}
