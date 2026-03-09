import { test } from "vitest";
import assert from "node:assert/strict";

import { EVENTS } from "../lib/analytics";
import {
  buildDashboardAnalytics,
  buildExperimentExposureSummaries,
} from "../lib/admin/analytics";
import type {
  AnalyticsEventRecord,
  AnalyticsLeadRecord,
} from "../types/analytics";

test("buildDashboardAnalytics derives funnel counts and rankings", () => {
  const events: AnalyticsEventRecord[] = [
    {
      id: "1",
      event_name: EVENTS.LANDING_VIEW,
      payload: { landing_path: "/" },
      created_at: "2026-03-01T00:00:00.000Z",
    },
    {
      id: "2",
      event_name: EVENTS.LANDING_VIEW,
      payload: { landing_path: "/" },
      created_at: "2026-03-01T01:00:00.000Z",
    },
    {
      id: "3",
      event_name: EVENTS.LANDING_VIEW,
      payload: { landing_path: "/hvac" },
      created_at: "2026-03-01T02:00:00.000Z",
    },
    {
      id: "4",
      event_name: EVENTS.AGENT_CHAT_START,
      created_at: "2026-03-01T03:00:00.000Z",
    },
    {
      id: "5",
      event_name: EVENTS.AGENT_CHAT_PLAN_COMPLETE,
      created_at: "2026-03-01T04:00:00.000Z",
    },
    {
      id: "6",
      event_name: EVENTS.LEAD_SUBMIT,
      created_at: "2026-03-01T05:00:00.000Z",
    },
    {
      id: "7",
      event_name: EVENTS.PREVIEW_PLAN_EMAIL_CAPTURE,
      created_at: "2026-03-01T05:30:00.000Z",
    },
    {
      id: "8",
      event_name: EVENTS.BOOKING_CLICK,
      created_at: "2026-03-01T06:00:00.000Z",
    },
    {
      id: "9",
      event_name: EVENTS.PLAN_SHARED_COPY_LINK,
      created_at: "2026-03-01T07:00:00.000Z",
    },
    {
      id: "10",
      event_name: EVENTS.PLAN_VIEW_SHARED,
      created_at: "2026-03-01T08:00:00.000Z",
    },
  ];

  const leads: AnalyticsLeadRecord[] = [
    {
      id: "l1",
      utm_source: "google",
      landing_path: "/",
      created_at: "2026-03-01T05:00:00.000Z",
    },
    {
      id: "l2",
      source: "agent_chat",
      landing_path: "/hvac",
      created_at: "2026-03-01T05:00:00.000Z",
    },
  ];

  const analytics = buildDashboardAnalytics(events, leads);

  assert.equal(analytics.funnel.landingViews, 3);
  assert.equal(analytics.funnel.previewStarts, 1);
  assert.equal(analytics.funnel.previewCompleted, 1);
  assert.equal(analytics.funnel.leadsSubmitted, 1);
  assert.equal(analytics.funnel.previewPlanEmailCaptures, 1);
  assert.equal(analytics.funnel.bookingClicks, 1);
  assert.equal(analytics.funnel.planShares, 1);
  assert.equal(analytics.funnel.sharedPlanViews, 1);
  assert.equal(analytics.funnel.previewCompletionRate, 100);
  assert.equal(analytics.funnel.leadConversionRate, 33.3);
  assert.equal(analytics.funnel.previewEmailCaptureRate, 100);
  assert.equal(analytics.funnel.bookingClickRate, 100);
  assert.equal(analytics.topLandingPaths[0]?.path, "/");
  assert.equal(analytics.topLandingPaths[0]?.views, 2);
  assert.equal(analytics.topLandingPaths[0]?.leads, 1);
  assert.equal(analytics.leadSources[0]?.source, "google");
});

test("buildExperimentExposureSummaries groups exposures by experiment and variant", () => {
  const events: AnalyticsEventRecord[] = [
    {
      id: "1",
      event_name: EVENTS.LANDING_EXPERIMENT_EXPOSURE,
      payload: {
        experiment_id: "exp_1",
        experiment_name: "Hero test",
        target: "hero_headline",
        variant_key: "control",
        variant_label: "Control",
      },
      created_at: "2026-03-01T00:00:00.000Z",
    },
    {
      id: "2",
      event_name: EVENTS.LANDING_EXPERIMENT_EXPOSURE,
      payload: {
        experiment_id: "exp_1",
        experiment_name: "Hero test",
        target: "hero_headline",
        variant_key: "variant_a",
        variant_label: "Variant A",
      },
      created_at: "2026-03-02T00:00:00.000Z",
    },
    {
      id: "3",
      event_name: EVENTS.LANDING_EXPERIMENT_EXPOSURE,
      payload: {
        experiment_id: "exp_1",
        experiment_name: "Hero test",
        target: "hero_headline",
        variant_key: "variant_a",
        variant_label: "Variant A",
      },
      created_at: "2026-03-03T00:00:00.000Z",
    },
    {
      id: "4",
      event_name: EVENTS.LEAD_SUBMIT,
      payload: {
        experiment_assignments: [
          {
            experiment_id: "exp_1",
            experiment_name: "Hero test",
            target: "hero_headline",
            variant_key: "variant_a",
            variant_label: "Variant A",
          },
        ],
      },
      created_at: "2026-03-03T01:00:00.000Z",
    },
    {
      id: "5",
      event_name: EVENTS.BOOKING_CLICK,
      payload: {
        experiment_assignments: [
          {
            experiment_id: "exp_1",
            experiment_name: "Hero test",
            target: "hero_headline",
            variant_key: "variant_a",
            variant_label: "Variant A",
          },
        ],
      },
      created_at: "2026-03-03T02:00:00.000Z",
    },
  ];

  const summaries = buildExperimentExposureSummaries(events);
  const summary = summaries.exp_1;

  assert.ok(summary);
  assert.equal(summary.experimentName, "Hero test");
  assert.equal(summary.exposures, 3);
  assert.equal(summary.leads, 1);
  assert.equal(summary.bookings, 1);
  assert.equal(summary.leadConversionRate, 33.3);
  assert.equal(summary.variants[0]?.key, "variant_a");
  assert.equal(summary.variants[0]?.exposures, 2);
  assert.equal(summary.variants[0]?.leads, 1);
  assert.equal(summary.variants[0]?.bookings, 1);
  assert.equal(summary.variants[0]?.leadConversionRate, 50);
  assert.equal(summary.variants[0]?.share, 66.7);
  assert.equal(summary.lastSeen, "2026-03-03T00:00:00.000Z");
});
