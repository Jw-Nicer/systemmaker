"use client";

import { useEffect, useState } from "react";
import {
  AdminMetricCard,
  AdminPill,
} from "@/components/admin/AdminPrimitives";
import type { PipelineMetrics as PipelineMetricsData } from "@/lib/firestore/traces";

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function PipelineMetricsSkeleton() {
  return (
    <div className="mt-10 space-y-4">
      <div className="h-6 w-44 animate-pulse rounded-md bg-[#d9d1c3]/40" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-[28px] bg-[#d9d1c3]/40"
          />
        ))}
      </div>
    </div>
  );
}

export default function PipelineMetrics() {
  const [data, setData] = useState<PipelineMetricsData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/pipeline-metrics")
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
        Pipeline metrics are temporarily unavailable.
      </div>
    );
  }

  if (!data) return <PipelineMetricsSkeleton />;

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-[#1d2318]">
          Agent Pipeline
        </h2>
        <AdminPill tone="blue">Last {data.windowDays} days</AdminPill>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Plans Today"
          value={data.plansToday}
          meta={`${data.totalPlans} in last ${data.windowDays}d`}
        />
        <AdminMetricCard
          label="Avg Latency"
          value={formatLatency(data.avgLatencyMs)}
          meta={`p95: ${formatLatency(data.p95LatencyMs)}`}
        />
        <AdminMetricCard
          label="Failure Rate"
          value={formatPercent(data.failureRate)}
          meta="Pipeline failures"
        />
        <AdminMetricCard
          label="Plans / Day"
          value={data.plansPerDay}
          meta={`${data.windowDays}-day average`}
        />
      </div>
    </div>
  );
}
