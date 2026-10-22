import { readTeacherAppSource } from "./support/teacher-source";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const arena = readTeacherAppSource();
const themePreference = readFileSync(resolve(process.cwd(), "lib/theme-preference.ts"), "utf8");
const themeContract = readFileSync(resolve(process.cwd(), "styles/theme.css"), "utf8");
const layout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8");

test("settings expose dark light and system preferences", () => {
  assert.match(arena, /Tema da interface/);
  assert.match(arena, /Escuro/);
  assert.match(arena, /Claro/);
  assert.match(arena, /Sistema/);
});

test("theme preference persists locally and resolves system theme", () => {
  assert.match(themePreference, /arena-dev-theme/);
  assert.match(themePreference, /matchMedia/);
  assert.match(themePreference, /localStorage/);
});

test("theme is applied before the application paints", () => {
  assert.match(layout, /arena-dev-theme/);
  assert.match(layout, /dataset\.theme/);
});

test("light theme is defined by the semantic theme contract", () => {
  assert.match(themeContract, /html\[data-theme="light"\]/);
  // 11.7: calmer light canvas and off-white surfaces (glare reduction).
  assert.match(themeContract, /--theme-canvas:\s*#e9eeeb/);
  assert.match(themeContract, /--theme-surface-toolbar:\s*#fbfcfb/);
});
