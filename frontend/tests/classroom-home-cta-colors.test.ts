import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

test("final CTA rules preserve 90% width after generic polish", () => {
  assert.match(css, /13\.7C2 — final CTA state colors/);
  assert.match(css, /\.arena-launch-shell\s*\{[\s\S]*?width:\s*min\(90%,\s*1120px\)/);
});

test("start and resume CTA keep distinct final colors", () => {
  assert.match(
    css,
    /\.arena-launch-button-centered\.arena-launch-button-start\s*\{[\s\S]*?background:\s*linear-gradient\(180deg,\s*#58f3a7/,
  );
  assert.match(
    css,
    /\.arena-launch-button-centered\.arena-launch-button-resume\s*\{[\s\S]*?background:\s*linear-gradient\(180deg,\s*#67afff/,
  );

  const genericPolish = css.lastIndexOf(".arena-launch-button-centered {");
  const startRule = css.lastIndexOf(".arena-launch-button-centered.arena-launch-button-start {");
  const resumeRule = css.lastIndexOf(".arena-launch-button-centered.arena-launch-button-resume {");

  assert.ok(startRule > genericPolish, "green start rule must come after generic CTA polish");
  assert.ok(resumeRule > genericPolish, "blue resume rule must come after generic CTA polish");
});
