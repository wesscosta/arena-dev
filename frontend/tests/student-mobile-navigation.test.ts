import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shell = readFileSync("components/study/StudyShell.tsx", "utf8");
const css = readFileSync("components/study/study.module.css", "utf8");

test("student mobile navigation exposes the same five destinations as desktop", () => {
  for (const destination of ["/learn", "/learn/journeys", "/learn/live", "/learn/achievements", "/learn/profile"]) {
    const occurrences = shell.split(`href="${destination}"`).length - 1;
    assert.ok(occurrences >= 2, `Missing mobile and desktop destination: ${destination}`);
  }
  assert.match(shell, /aria-expanded=\{mobileMenuOpen\}/);
  assert.match(shell, /aria-controls="student-mobile-navigation"/);
  assert.match(shell, /setMobileMenuOpen\(false\)/);
  assert.match(css, /@media\(max-width:820px\)/);
  assert.match(css, /\.mobileNavigation\{position:sticky/);
});
