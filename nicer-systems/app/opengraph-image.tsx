import { ImageResponse } from "next/og";

export const alt = "Nicer Systems";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "linear-gradient(135deg, #f5efe2 0%, #e7dfcf 48%, #d8cfbc 100%)",
          color: "#172117",
          padding: "56px",
          position: "relative",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "24px",
            border: "1px solid rgba(23, 33, 23, 0.08)",
            borderRadius: "32px",
            background:
              "radial-gradient(circle at top left, rgba(255,255,255,0.75), rgba(255,255,255,0) 36%), linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.08))",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              fontSize: "26px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#51624a",
            }}
          >
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "999px",
                background: "#55722b",
                boxShadow: "0 0 0 10px rgba(85, 114, 43, 0.14)",
              }}
            />
            Nicer Systems
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "860px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: "86px",
                lineHeight: 0.93,
                letterSpacing: "-0.06em",
                color: "#172117",
              }}
            >
              Tell us the problem.
              <br />
              We&apos;ll build the system.
            </div>
            <div
              style={{
                fontSize: "32px",
                lineHeight: 1.35,
                color: "#33412f",
                maxWidth: "760px",
              }}
            >
              Workflow mapping, KPI visibility, alert design, and implementation planning
              for admin-heavy businesses.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "18px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {["Workflow map", "KPIs and alerts", "Preview plan"].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  padding: "14px 22px",
                  borderRadius: "999px",
                  border: "1px solid rgba(23, 33, 23, 0.12)",
                  background: "rgba(255,255,255,0.52)",
                  color: "#243021",
                  fontSize: "24px",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
