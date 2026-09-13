import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const globals = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const theme = readFileSync(resolve(process.cwd(), "styles/theme.css"), "utf8");
const tokens = readFileSync(resolve(process.cwd(), "styles/tokens.css"), "utf8");
const arenaPolish = readFileSync(resolve(process.cwd(), "styles/arena-polish.css"), "utf8");

test("semantic theme contract owns dark and light colors", () => {
  assert.match(theme, /html\[data-theme="dark"\]/);
  assert.match(theme, /html\[data-theme="light"\]/);
  assert.match(theme, /--theme-surface-control/);
  assert.match(theme, /--theme-text-tertiary/);
});

test("globals imports theme contract before design tokens", () => {
  const themeIndex = globals.indexOf('@import "../styles/theme.css"');
  const tokensIndex = globals.indexOf('@import "../styles/tokens.css"');
  assert.ok(themeIndex >= 0);
  assert.ok(tokensIndex > themeIndex);
});

test("design system exposes semantic color aliases", () => {
  assert.match(tokens, /--ds-canvas/);
  assert.match(tokens, /--ds-surface-control/);
  assert.match(tokens, /--ds-text-tertiary/);
  assert.match(tokens, /--ds-border-subtle/);
});

test("known dark-only overview and Arena backgrounds use semantic tokens", () => {
  assert.doesNotMatch(globals, /background:\s*#09120f/);
  assert.doesNotMatch(globals, /background:\s*#0a1310/);
  assert.doesNotMatch(arenaPolish, /rgba\(8,\s*16,\s*14,\s*\.97\)/);
  assert.match(arenaPolish, /--ds-sticky-top/);
});
