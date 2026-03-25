import { test, describe, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      where: () => ({
        limit: () => ({
          get: () => Promise.resolve({ docs: [] }),
        }),
      }),
      get: () => Promise.resolve({ docs: [] }),
    }),
  }),
}));

const mockGetPublishedCaseStudies = vi.fn().mockResolvedValue([]);
vi.mock("@/lib/firestore/case-studies", () => ({
  getPublishedCaseStudies: (...args: unknown[]) =>
    mockGetPublishedCaseStudies(...args),
}));

// Import after mocks
import {
  getToolsForStage,
  executeTool,
  getToolContextForStage,
  AGENT_TOOLS,
} from "@/lib/agents/tools";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getToolsForStage", () => {
  // 1. intake_agent gets tools with intake_agent in allowedStages
  test("returns tools that include intake_agent in allowedStages", () => {
    const tools = getToolsForStage("intake_agent");
    const toolNames = tools.map((t) => t.name);

    assert.ok(toolNames.includes("searchCaseStudies"));
    // searchExistingPlans is only allowed for workflow_mapper / automation_designer
    assert.ok(!toolNames.includes("searchExistingPlans"));
  });

  // 2. automation_designer gets searchExistingPlans but NOT searchCaseStudies
  test("returns searchExistingPlans but not searchCaseStudies for automation_designer", () => {
    const tools = getToolsForStage("automation_designer");
    const toolNames = tools.map((t) => t.name);

    assert.ok(toolNames.includes("searchExistingPlans"));
    assert.ok(!toolNames.includes("searchCaseStudies"));
  });

  // 3. Returns tools for a stage that has tools in its allowedStages
  test("returns getIndustryBenchmarks for dashboard_designer", () => {
    const tools = getToolsForStage("dashboard_designer");
    const toolNames = tools.map((t) => t.name);

    assert.ok(toolNames.includes("getIndustryBenchmarks"));
  });
});

describe("executeTool", () => {
  beforeEach(() => {
    mockGetPublishedCaseStudies.mockReset();
    mockGetPublishedCaseStudies.mockResolvedValue([]);
  });

  // 4. Missing required field returns error
  test("returns error when required input field is missing", async () => {
    const result = await executeTool("getIndustryBenchmarks", {});

    assert.ok(result.error);
    assert.ok(result.error.includes("Invalid tool input"));
    assert.equal(result.output, null);
  });

  // 5. Non-existent tool returns error
  test("returns error for non-existent tool", async () => {
    const result = await executeTool("nonExistentTool", {
      industry: "test",
    });

    assert.ok(result.error);
    assert.ok(result.error.includes("Tool not found"));
    assert.equal(result.output, null);
    assert.equal(result.latencyMs, 0);
  });

  // 6. getIndustryBenchmarks for construction includes Job Completion Rate
  test("returns construction benchmarks including Job Completion Rate", async () => {
    const result = await executeTool("getIndustryBenchmarks", {
      industry: "construction",
    });

    assert.ok(!result.error);
    const output = result.output as { kpis: Array<{ name: string }> };
    const kpiNames = output.kpis.map((k) => k.name);

    assert.ok(kpiNames.includes("Job Completion Rate"));
    assert.ok(kpiNames.includes("Change Order Processing Time"));
  });

  // 7. Unknown industry returns generic fallback KPIs
  test("returns generic fallback KPIs for unknown industry", async () => {
    const result = await executeTool("getIndustryBenchmarks", {
      industry: "underwater welding",
    });

    assert.ok(!result.error);
    const output = result.output as { kpis: Array<{ name: string }> };
    const kpiNames = output.kpis.map((k) => k.name);

    assert.ok(kpiNames.includes("Process Cycle Time"));
    assert.ok(kpiNames.includes("Error Rate"));
    assert.ok(kpiNames.includes("Task Completion Rate"));
    assert.ok(kpiNames.includes("Response Time"));
  });

  // 8. Partial match: dental clinic matches dental benchmarks
  test("returns dental benchmarks for 'dental clinic' (partial match)", async () => {
    const result = await executeTool("getIndustryBenchmarks", {
      industry: "dental clinic",
    });

    assert.ok(!result.error);
    const output = result.output as { kpis: Array<{ name: string }> };
    const kpiNames = output.kpis.map((k) => k.name);

    assert.ok(kpiNames.includes("Chair Utilization"));
    assert.ok(kpiNames.includes("Treatment Acceptance Rate"));
  });

  // 9. searchCaseStudies with mocked case studies filters by industry
  test("searchCaseStudies filters case studies by industry", async () => {
    mockGetPublishedCaseStudies.mockResolvedValueOnce([
      {
        title: "Construction Co Automation",
        industry: "Construction",
        challenge: "Scheduling chaos",
        solution: "Automated dispatch",
        metrics: [{ label: "Time saved", value: "40%" }],
      },
      {
        title: "Dental Clinic Workflow",
        industry: "Dental",
        challenge: "Patient management",
        solution: "Digital intake",
        metrics: [{ label: "Wait time", value: "-50%" }],
      },
    ]);

    const result = await executeTool("searchCaseStudies", {
      industry: "construction",
    });

    assert.ok(!result.error);
    const output = result.output as Array<{ title: string }>;
    assert.equal(output.length, 1);
    assert.equal(output[0].title, "Construction Co Automation");
  });

  // 10. Validates input against schema — wrong type
  test("validates input type against tool schema", async () => {
    const result = await executeTool("getIndustryBenchmarks", {
      industry: 12345,
    });

    assert.ok(result.error);
    assert.ok(result.error.includes("Invalid tool input"));
  });

  // 11. executeTool records latencyMs
  test("records latencyMs for successful execution", async () => {
    const result = await executeTool("getIndustryBenchmarks", {
      industry: "healthcare",
    });

    assert.ok(!result.error);
    assert.equal(typeof result.latencyMs, "number");
    assert.ok(result.latencyMs >= 0);
  });
});

describe("getToolContextForStage", () => {
  // 12. Returns empty string for stage with no matching tools
  test('returns "" for stage with no matching tools', async () => {
    const context = await getToolContextForStage("unknown_stage_xyz", {
      industry: "construction",
    });

    // unknown_stage_xyz doesn't appear in any tool's allowedStages
    // But tools with no allowedStages or empty array match all stages.
    // All 3 built-in tools have explicit allowedStages arrays, so
    // a completely unknown stage should get no tools.
    assert.equal(context, "");
  });
});
