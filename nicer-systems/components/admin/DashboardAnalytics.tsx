"use client";

import { useEffect, useState } from "react";
import {
  AdminMetricCard,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminPrimitives";
import type { DashboardAnalytics as DashboardAnalyticsData } from "@/types/analytics";

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[20px] bg-[#d9d1c3]/40 ${className ?? ""}`}
    />
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="mt-10 space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-[28px]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-48 rounded-[28px]" />
        <div className="grid gap-4">
          <Skeleton className="h-36 rounded-[28px]" />
          <Skeleton className="h-36 rounded-[28px]" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardAnalytics() {
  const [data, setData] = useState<DashboardAnalyticsData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="mt-10 rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        Analytics data is temporarily unavailable.
      </div>
    );
  }

  if (!data) return <AnalyticsSkeleton />;

  const { funnel } = data;

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-[#1d2318]">Funnel</h2>
        <AdminPill tone="blue">Last {data.windowDays} days</AdminPill>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Landing Views"
          value={funnel.landingViews}
          meta="Tracked visits"
        />
        <AdminMetricCard
          label="Preview Starts"
          value={funnel.previewStarts}
          meta="Demo + chat starts"
        />
        <AdminMetricCard
          label="Preview Completed"
          value={funnel.previewCompleted}
          meta={`${formatPercent(funnel.previewCompletionRate)} of starts`}
        />
        <AdminMetricCard
          label="Leads Submitted"
          value={funnel.leadsSubmitted}
          meta={`${formatPercent(funnel.leadConversionRate)} of landing views`}
        />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminPanel>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#7e7b70]">
                Top Landing Paths
              </p>
              <p className="mt-2 text-sm text-[#596351]">
                Compare where traffic lands against where leads actually
                convert.
              </p>
            </div>
            <AdminPill tone="neutral">
              {data.topLandingPaths.length} tracked
            </AdminPill>
          </div>
          {data.topLandingPaths.length === 0 ? (
            <p className="mt-4 text-sm text-[#6c7467]">
              No landing-path analytics captured yet.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-[20px] border border-[#ddd5c7] bg-white/50">
              <table className="w-full text-sm">
                <thead className="bg-white/60">
                  <tr className="border-b border-[#ddd5c7]">
                    <th className="px-4 py-3 text-left font-medium text-[#6c7467]">
                      Path
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[#6c7467]">
                      Views
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[#6c7467]">
                      Leads
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[#6c7467]">
                      Conv.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topLandingPaths.map((path) => (
                    <tr
                      key={path.path}
                      className="border-b border-[#e1d9cb] last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-[#1d2318]">
                        {path.path}
                      </td>
                      <td className="px-4 py-3 text-[#596351]">
                        {path.views}
                      </td>
                      <td className="px-4 py-3 text-[#596351]">
                        {path.leads}
                      </td>
                      <td className="px-4 py-3 text-[#596351]">
                        {formatPercent(path.conversionRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>

        <div className="grid gap-4">
          <AdminPanel tone="accent">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#d9d1c3]">
              Conversion Signals
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-3xl font-semibold tracking-[-0.04em]">
                  {funnel.previewPlanEmailCaptures}
                </p>
                <p className="mt-1 text-sm text-[#d8cfbe]">
                  Plan email captures
                </p>
                <p className="mt-1 text-xs text-[#bcb39f]">
                  {formatPercent(funnel.previewEmailCaptureRate)} of completed
                  previews
                </p>
              </div>
              <div>
                <p className="text-3xl font-semibold tracking-[-0.04em]">
                  {funnel.bookingClicks}
                </p>
                <p className="mt-1 text-sm text-[#d8cfbe]">Booking clicks</p>
                <p className="mt-1 text-xs text-[#bcb39f]">
                  {formatPercent(funnel.bookingClickRate)} of leads
                </p>
              </div>
              <div>
                <p className="text-3xl font-semibold tracking-[-0.04em]">
                  {funnel.planShares}
                </p>
                <p className="mt-1 text-sm text-[#d8cfbe]">
                  Plan share actions
                </p>
                <p className="mt-1 text-xs text-[#bcb39f]">
                  {funnel.sharedPlanViews} shared-plan views
                </p>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#7e7b70]">
                  Lead Sources
                </p>
                <p className="mt-2 text-sm text-[#596351]">
                  Based on UTM source when available, then fall back to lead
                  source.
                </p>
              </div>
              <AdminPill tone="neutral">
                {data.leadSources.length} sources
              </AdminPill>
            </div>
            {data.leadSources.length === 0 ? (
              <p className="mt-4 text-sm text-[#6c7467]">
                No lead source data yet.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {data.leadSources.map((source) => (
                  <div
                    key={source.source}
                    className="flex items-center justify-between rounded-[18px] border border-[#ddd5c7] bg-white/55 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-[#1d2318]">
                      {source.source}
                    </span>
                    <AdminPill tone="blue">{source.leads} leads</AdminPill>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
