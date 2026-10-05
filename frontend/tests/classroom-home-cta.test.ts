import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const arena = readFileSync(resolve(process.cwd(), "components/ArenaApp.tsx"), "utf8");
const cta = readFileSync(resolve(process.cwd(), "lib/classroom-arena-cta.ts"), "utf8");
const moduleCss = readFileSync(
  resolve(process.cwd(), "components/ClassroomHome.module.css"),
  "utf8",
);

test("classroom Home maps Arena lifecycle to locally owned CTA states", () => {
  assert.match(arena, /classroomHomeStyles\.sessionActionStart/);
  assert.match(arena, /classroomHomeStyles\.sessionActionResume/);
  assert.match(arena, /classroomHomeStyles\.sessionActionDisabled/);
  assert.match(cta, /tone:\s*"resume"/);
  assert.match(cta, /tone:\s*"start"/);
  assert.match(cta, /tone:\s*"disabled"/);
  assert.match(moduleCss, /\.sessionActionStart\s*\{/);
  assert.match(moduleCss, /\.sessionActionResume\s*\{/);
});

test("Home keeps session ending inside Arena", () => {
  assert.doesNotMatch(arena, /arena-launch-overflow/);
  assert.doesNotMatch(arena, /quickFinishSession/);
  assert.doesNotMatch(arena, /Encerrar aula em andamento/);
});
