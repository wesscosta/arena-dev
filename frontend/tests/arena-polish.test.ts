import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("Arena polish consumes the global Design System tokens", () => {
  const css = read("styles/arena-polish.css");

  assert.match(css, /var\(--font-size-sm\)/);
  assert.match(css, /var\(--space-5\)/);
  assert.match(css, /var\(--control-md\)/);
  assert.match(css, /var\(--radius-lg\)/);
});

test("Arena source is treated as a toolbar instead of a nested card", () => {
  const css = read("styles/arena-polish.css");

  assert.match(css, /\.arena-activity-strip/);
  assert.match(css, /background:\s*transparent/);
  assert.match(css, /border-bottom:/);
});

test("primary Arena grid collapses before mobile widths", () => {
  const css = read("styles/arena-polish.css");

  assert.match(css, /@media \(max-width: 72rem\)/);
  assert.match(
    css,
    /\.arena-grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
});

test("mobile scoring and session actions reflow to one column", () => {
  const css = read("styles/arena-polish.css");

  assert.match(css, /@media \(max-width: 42rem\)/);
  assert.match(css, /\.score-presets\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.custom-score\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("globals imports Arena polish after accessibility foundation", () => {
  const globals = read("app/globals.css");

  const accessibility = globals.indexOf(
    '@import "../styles/accessibility.css";'
  );
  const polish = globals.indexOf('@import "../styles/arena-polish.css";');

  assert.ok(accessibility >= 0);
  assert.ok(polish > accessibility);
});
