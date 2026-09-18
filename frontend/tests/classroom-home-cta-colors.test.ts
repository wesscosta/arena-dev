import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

test("Arena CTA final polish uses the full available width", () => {
  const finalMarker = css.lastIndexOf("14.11C.5b — Full-width Arena CTA + unified green states");

  assert.ok(finalMarker >= 0, "final v0.6 Arena CTA polish marker must exist");

  const finalCss = css.slice(finalMarker);

  assert.match(
    finalCss,
    /\.arena-launch-shell\s*\{[\s\S]*?width:\s*100%\s*!important/,
  );
  assert.match(
    finalCss,
    /\.arena-launch-button-centered\s*\{[\s\S]*?width:\s*100%\s*!important/,
  );
});

test("Arena start and resume CTAs stay inside the green visual language", () => {
  assert.match(
    css,
    /\.arena-launch-button-centered\.arena-launch-button-start\s*\{[\s\S]*?background:\s*linear-gradient\(180deg,\s*#58f3a7/,
  );

  const finalMarker = css.lastIndexOf("14.11C.5b — Full-width Arena CTA + unified green states");
  assert.ok(finalMarker >= 0, "final v0.6 Arena CTA polish marker must exist");

  const finalCss = css.slice(finalMarker);

  assert.match(
    finalCss,
    /\.arena-launch-button-centered\.arena-launch-button-resume\s*\{[\s\S]*?background:\s*linear-gradient\(\s*180deg,\s*#47dda0/,
  );

  assert.doesNotMatch(
    finalCss,
    /#67afff/i,
    "the final resume CTA override must not restore the legacy blue state",
  );
});
