import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("design tokens define shared typography and interaction scale", () => {
  const tokens = read("styles/tokens.css");
  assert.match(tokens, /--font-size-xs:\s*0\.75rem/);
  assert.match(tokens, /--font-size-md:\s*1rem/);
  assert.match(tokens, /--font-size-2xl:\s*1\.5rem/);
  assert.match(tokens, /--target-comfortable:\s*2\.75rem/);
  assert.match(tokens, /--focus-width:\s*3px/);
});

test("accessibility foundation provides focus and motion preferences", () => {
  const accessibility = read("styles/accessibility.css");
  assert.match(accessibility, /:focus-visible/);
  assert.match(accessibility, /prefers-reduced-motion:\s*reduce/);
  assert.match(accessibility, /prefers-contrast:\s*more/);
  assert.match(accessibility, /forced-colors:\s*active/);
  assert.match(accessibility, /\.sr-only/);
});

test("globals imports design system files before legacy styles", () => {
  const globals = read("app/globals.css");
  const tokens = globals.indexOf('@import "../styles/tokens.css";');
  const base = globals.indexOf('@import "../styles/base.css";');
  const accessibility = globals.indexOf('@import "../styles/accessibility.css";');
  assert.ok(tokens >= 0);
  assert.ok(base > tokens);
  assert.ok(accessibility > base);
});
