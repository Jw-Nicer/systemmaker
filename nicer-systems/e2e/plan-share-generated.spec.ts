import { expect, test } from "@playwright/test";

test.describe("Generated plan sharing", () => {
  test("a newly generated preview plan opens from its returned share URL", async ({
    page,
    request,
    baseURL,
  }) => {
    test.setTimeout(180_000);

    const response = await request.post("/api/agent/run", {
      data: {
        industry: "Property Management",
        bottleneck:
          "Maintenance requests arrive through phone and email, then staff copy them into a spreadsheet. Vendor assignment is delayed and tenants keep asking for updates.",
        current_tools: "Gmail, Google Sheets, phone",
        urgency: "high",
        volume: "40 requests/week",
      },
    });

    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as {
      plan_id: string;
      share_url: string;
      preview_plan: {
        intake?: { suggested_scope?: string };
      };
    };

    expect(body.plan_id).toBeTruthy();
    expect(body.share_url).toBeTruthy();
    expect(body.share_url).toContain(`/plan/${body.plan_id}`);
    expect(body.preview_plan?.intake?.suggested_scope).toBeTruthy();

    const shareUrl = body.share_url.startsWith("http")
      ? body.share_url
      : new URL(body.share_url, baseURL).toString();

    await page.goto(shareUrl, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: /Preview Plan/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("button", { name: /Copy link/i })).toBeVisible();
    await expect(
      page.getByText(body.preview_plan.intake!.suggested_scope!, { exact: false })
    ).toBeVisible();
  });
});
