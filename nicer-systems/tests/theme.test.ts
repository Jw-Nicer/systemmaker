import { test } from "vitest";
import assert from "node:assert/strict";
import {
  GRADIENT_PRESET_BACKGROUNDS,
  themeToCSSVariables,
} from "@/lib/theme";

test("themeToCSSVariables exposes live theme controls", () => {
  const vars = themeToCSSVariables({
    theme_primary: "#112233",
    theme_secondary: "#445566",
    gradient_preset: "sage-mist",
    glow_intensity: 80,
    motion_intensity: 3,
    brush_style: "spray",
  });

  assert.equal(vars["--theme-page-background"], GRADIENT_PRESET_BACKGROUNDS["sage-mist"]);
  assert.equal(vars["--theme-brush-overlay-opacity"], "0.68");
  assert.equal(vars["--theme-brush-overlay-blur"], "6px");
  assert.equal(vars["--breathe-duration"], "6s");
  assert.equal(vars["--morph-duration"], "9s");
});
