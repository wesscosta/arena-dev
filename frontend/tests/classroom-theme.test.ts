import assert from "node:assert/strict";
import test from "node:test";
import { CLASSROOM_THEME_COLORS, CLASSROOM_THEME_ICONS, classroomThemePresentation } from "../lib/classroom-theme";

test("classroom theme uses a curated palette", () => {
  assert.equal(CLASSROOM_THEME_COLORS.length, 8);
  assert.deepEqual(CLASSROOM_THEME_COLORS.map((item) => item.id), ["emerald", "teal", "blue", "indigo", "violet", "amber", "orange", "rose"]);
});

test("classroom theme exposes semantic icons", () => {
  assert.equal(CLASSROOM_THEME_ICONS.length, 8);
  assert.equal(CLASSROOM_THEME_ICONS[0]?.glyph, "</>");
});

test("missing appearance falls back to Arena defaults", () => {
  const presentation = classroomThemePresentation({ id: "classroom-1", name: "Turma", code: "", createdAt: "2026-09-12T00:00:00Z" });
  assert.equal(presentation.glyph, "</>");
  assert.equal(presentation.color, "#49d49d");
});

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const [r, g, b] = channels.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

test("classroom accents keep AA text contrast on both themes", () => {
  for (const color of CLASSROOM_THEME_COLORS) {
    // Dark surface (--theme-surface) and the light inset panel behind the session kicker.
    assert.ok(contrast(color.value, "#0d1714") >= 4.5, `${color.id} on dark surface`);
    assert.ok(contrast(color.lightValue, "#ffffff") >= 4.5, `${color.id} on light surface`);
    assert.ok(contrast(color.lightValue, "#eef4f0") >= 4.5, `${color.id} on light inset`);
  }
});

test("presentation exposes both theme values for the CSS scope", () => {
  const presentation = classroomThemePresentation({ id: "c", name: "Turma", code: "", createdAt: "2026-09-12T00:00:00Z", themeColor: "amber" });
  const style = presentation.style as Record<string, string>;
  assert.equal(style["--classroom-accent-dark"], "#fbbf24");
  assert.equal(style["--classroom-accent-light"], "#92400e");
});
