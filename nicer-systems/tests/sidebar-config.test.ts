import { test } from "vitest";
import assert from "node:assert/strict";

import { SIDEBAR_GROUPS } from "../lib/admin/sidebar-config";

test("SIDEBAR_GROUPS has 4 groups", () => {
  assert.equal(SIDEBAR_GROUPS.length, 4);
});

test("all groups have a title and at least one link", () => {
  for (const group of SIDEBAR_GROUPS) {
    assert.ok(group.title.length > 0, `Group missing title`);
    assert.ok(group.links.length > 0, `Group "${group.title}" has no links`);
  }
});

test("all links have href starting with /admin and a non-empty label", () => {
  for (const group of SIDEBAR_GROUPS) {
    for (const link of group.links) {
      assert.ok(link.href.startsWith("/admin"), `Link "${link.label}" href must start with /admin`);
      assert.ok(link.label.length > 0, `Link with href "${link.href}" has empty label`);
    }
  }
});

test("no duplicate hrefs across all groups", () => {
  const allHrefs = SIDEBAR_GROUPS.flatMap((g) => g.links.map((l) => l.href));
  const unique = new Set(allHrefs);
  assert.equal(unique.size, allHrefs.length, "Duplicate hrefs found");
});

test("group titles match expected values", () => {
  const titles = SIDEBAR_GROUPS.map((g) => g.title);
  assert.deepEqual(titles, ["Overview", "Content", "Growth", "System"]);
});

test("Dashboard link is exactly /admin (not /admin/dashboard)", () => {
  const overviewLinks = SIDEBAR_GROUPS[0].links;
  const dashboard = overviewLinks.find((l) => l.label === "Dashboard");
  assert.ok(dashboard);
  assert.equal(dashboard.href, "/admin");
});
