import { getPlanById } from "@/lib/firestore/plans";
import { planToMarkdown } from "@/lib/plans/export-markdown";
import { enforceRateLimit } from "@/lib/security/request-guards";

export async function GET(request: Request) {
  try {
    const limited = await enforceRateLimit(request, {
      keyPrefix: "plans_export",
      windowMs: 60_000,
      maxRequests: 15,
    });
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const format = searchParams.get("format") ?? "markdown";

    if (!id || id.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return new Response(JSON.stringify({ error: "Invalid plan id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (format !== "markdown") {
      return new Response(JSON.stringify({ error: "Unsupported format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stored = await getPlanById(id);
    if (!stored || !stored.is_public) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const markdown = planToMarkdown(stored.preview_plan);
    const filename = `preview-plan-${id.slice(0, 8)}.md`;

    return new Response(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Plans export error:", err);
    return new Response(JSON.stringify({ error: "Export failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
