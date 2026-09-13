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
