import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("Button supports semantic variants and loading state", () => {
  const source = read("components/ui/Button.tsx");
  assert.match(source, /"primary"\s*\|\s*"secondary"\s*\|\s*"ghost"\s*\|\s*"danger"/);
  assert.match(source, /aria-busy/);
  assert.match(source, /disabled=\{disabled \|\| loading\}/);
});

test("IconButton requires an accessible label", () => {
  const source = read("components/ui/IconButton.tsx");
  assert.match(source, /label:\s*string/);
  assert.match(source, /aria-label=\{label\}/);
});

test("Tabs provide keyboard navigation and tab semantics", () => {
  const source = read("components/ui/Tabs.tsx");
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /aria-selected/);
  assert.match(source, /ArrowLeft/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /Home/);
  assert.match(source, /End/);
});

test("Field connects label hint error and control", () => {
  const source = read("components/ui/Field.tsx");
  assert.match(source, /htmlFor=\{controlId\}/);
  assert.match(source, /aria-describedby/);
  assert.match(source, /aria-invalid/);
  assert.match(source, /role="alert"/);
});

test("Menu and Breadcrumb expose semantic navigation", () => {
  const menu = read("components/ui/Menu.tsx");
  const breadcrumb = read("components/ui/Breadcrumb.tsx");
  assert.match(menu, /role="menu"/);
  assert.match(menu, /role="menuitem"/);
  assert.match(menu, /Escape/);
  assert.match(breadcrumb, /aria-label=\{label\}/);
  assert.match(breadcrumb, /aria-current/);
});
