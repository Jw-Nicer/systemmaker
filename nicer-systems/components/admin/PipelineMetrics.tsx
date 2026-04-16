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

      {data.stageStats.length > 0 && (
        <div className="mt-6 rounded-[28px] border border-[#d9d1c3] bg-white/70 p-5">
          <h3 className="mb-3 text-sm font-semibold text-[#1d2318]">
            Stage failure rates
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[#6d6557]">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Stage</th>
                  <th className="pb-2 pr-4 font-medium">Runs</th>
                  <th className="pb-2 pr-4 font-medium">Failed</th>
                  <th className="pb-2 pr-4 font-medium">Degraded</th>
                  <th className="pb-2 pr-4 font-medium">Fail %</th>
                  <th className="pb-2 font-medium">Avg latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9e2d4]">
                {data.stageStats.map((stage) => (
                  <tr key={stage.stage}>
                    <td className="py-2 pr-4 font-medium text-[#1d2318]">
                      {stage.stage}
                    </td>
                    <td className="py-2 pr-4 text-[#3e3a31]">{stage.runs}</td>
                    <td className="py-2 pr-4 text-[#3e3a31]">{stage.failures}</td>
                    <td className="py-2 pr-4 text-[#3e3a31]">
                      {stage.degradations}
                    </td>
                    <td
                      className={`py-2 pr-4 font-medium ${
                        stage.failureRate >= 10
                          ? "text-red-700"
                          : stage.failureRate > 0
                            ? "text-amber-700"
                            : "text-[#3e3a31]"
                      }`}
                    >
                      {formatPercent(stage.failureRate)}
                    </td>
                    <td className="py-2 text-[#3e3a31]">
                      {formatLatency(stage.avgLatencyMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
