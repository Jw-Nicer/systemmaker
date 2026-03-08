import { ImageResponse } from "next/og";
import { getPlanById } from "@/lib/firestore/plans";

export const runtime = "nodejs";
export const alt = "Nicer Systems Preview Plan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await getPlanById(id);

  const industry = plan?.input_summary?.industry || "Business";
  const bottleneck = plan?.input_summary?.bottleneck_summary || "Custom automation plan";
  const stageCount = plan?.preview_plan?.workflow?.stages?.length ?? 0;
  const kpiCount = plan?.preview_plan?.dashboard?.kpis?.length ?? 0;
  const automationCount = plan?.preview_plan?.automation?.automations?.length ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "6px",
            }}
          >
            <span
              style={{
                fontSize: "26px",
                fontWeight: 400,
                color: "#f4efe5",
                letterSpacing: "-0.04em",
              }}
            >
              nicer
            </span>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#cbd3c2",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              systems
            </span>
          </span>
          <span
            style={{
              fontSize: "18px",
              color: "#64748b",
              marginLeft: "16px",
            }}
          >
            Preview Plan
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "52px",
            fontWeight: 800,
            color: "#f8fafc",
            lineHeight: 1.15,
            margin: "0 0 20px",
          }}
        >
          {industry} Automation Plan
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "22px",
            color: "#94a3b8",
            lineHeight: 1.5,
            margin: "0 0 40px",
            maxWidth: "900px",
          }}
        >
          {bottleneck.length > 120
            ? bottleneck.slice(0, 117) + "..."
            : bottleneck}
        </p>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: "40px",
          }}
        >
          {stageCount > 0 && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "36px", fontWeight: 700, color: "#60a5fa" }}>
                {stageCount}
              </span>
              <span style={{ fontSize: "16px", color: "#64748b" }}>
                Workflow Stages
              </span>
            </div>
          )}
          {automationCount > 0 && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "36px", fontWeight: 700, color: "#60a5fa" }}>
                {automationCount}
              </span>
              <span style={{ fontSize: "16px", color: "#64748b" }}>
                Automations
              </span>
            </div>
          )}
          {kpiCount > 0 && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "36px", fontWeight: 700, color: "#60a5fa" }}>
                {kpiCount}
              </span>
              <span style={{ fontSize: "16px", color: "#64748b" }}>
                Dashboard KPIs
              </span>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
