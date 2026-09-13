import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const arena = readFileSync(resolve(process.cwd(), "components/ArenaApp.tsx"), "utf8");
const cta = readFileSync(resolve(process.cwd(), "lib/classroom-arena-cta.ts"), "utf8");
const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

test("classroom home differentiates start and resume Arena CTAs", () => {
  assert.match(arena, /arena-launch-button-\$\{arenaCta\.tone\}/);
  assert.match(cta, /tone:\s*"resume"/);
  assert.match(cta, /tone:\s*"start"/);
  assert.match(css, /width:\s*min\(90%,1120px\)/);
});

test("home CTA keeps session lifecycle inside Arena", () => {
  assert.doesNotMatch(arena, /arena-launch-overflow/);
  assert.doesNotMatch(arena, /quickFinishSession/);
});

test("Home CTA keeps session ending inside the Arena", () => {
  assert.doesNotMatch(arena, /arena-launch-overflow/);
  assert.doesNotMatch(arena, /quickFinishSession/);
  assert.doesNotMatch(arena, /Encerrar aula em andamento/);
});
