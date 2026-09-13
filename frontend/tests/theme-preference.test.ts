import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const arena = readFileSync(resolve(process.cwd(), "components/ArenaApp.tsx"), "utf8");
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
  assert.match(themeContract, /--theme-canvas:\s*#f4f8f6/);
  assert.match(themeContract, /--theme-surface-toolbar:\s*#ffffff/);
});
