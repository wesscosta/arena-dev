import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("classroom header switcher removes the trigger monogram and reads as breadcrumb", () => {
  const css = read("components/ClassroomContextSwitcher.module.css");

  assert.match(css, /\.monogram\s*\{\s*display:\s*none/);
  assert.match(css, /\.triggerCopy\s*\{[\s\S]*display:\s*inline-flex/);
  assert.match(css, /\.triggerCopy small::before/);
  assert.match(css, /\.open \.chevron\s*\{[\s\S]*transform:\s*rotate\(180deg\)/);
});

test("classroom home final polish widens and softens Arena CTA until hover", () => {
  const css = read("styles/arena-polish.css");

  assert.match(css, /width:\s*clamp\(32rem,\s*62%,\s*58rem\)/);
  assert.match(css, /background:\s*rgba\(88,\s*243,\s*167,\s*\.66\)/);
  assert.match(css, /\.arena-launch-button-centered:hover:not\(:disabled\)/);
  assert.match(css, /background:\s*var\(--accent\)/);
  assert.match(css, /\.classroom-manage-button\s*\{[\s\S]*opacity:\s*\.72/);
});
