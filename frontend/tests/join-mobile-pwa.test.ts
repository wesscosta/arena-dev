import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const join = readFileSync(resolve(process.cwd(), "app/join/page.tsx"), "utf8");
const globals = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const quizCss = readFileSync(resolve(process.cwd(), "app/join/quiz.module.css"), "utf8");

test("join exposes explicit reconnect instead of relying only on backoff", () => {
  assert.match(join, /function reconnectNow\(\)/);
  assert.match(join, />Tentar agora</);
  assert.match(join, /setReconnectVersion\(\(value\) => value \+ 1\)/);
});

test("join states that offline shell is not domain truth", () => {
  assert.match(join, /A interface continua disponível/);
  assert.match(join, /estado da aula dependem do servidor/);
  assert.match(join, /navigator\.onLine/);
});

test("mobile join uses safe areas, dynamic viewport and 16px form controls", () => {
  assert.match(globals, /100dvh/);
  assert.match(globals, /safe-area-inset-bottom/);
  assert.match(globals, /student-code-input/);
  assert.match(globals, /font-size:\s*16px/);
});

test("quiz answers keep coarse-pointer touch targets", () => {
  assert.match(quizCss, /pointer:\s*coarse/);
  assert.match(quizCss, /min-height:\s*56px/);
  assert.match(quizCss, /touch-action:\s*manipulation/);
});
