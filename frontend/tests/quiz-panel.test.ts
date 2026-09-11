import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const panel = readFileSync(resolve(process.cwd(), "components/QuizPanel.tsx"), "utf8");

test("teacher quiz panel exposes the explicit lifecycle controls", () => {
  assert.match(panel, /prepareQuiz/);
  assert.match(panel, /openQuiz/);
  assert.match(panel, /lockQuiz/);
  assert.match(panel, /revealQuiz/);
  assert.match(panel, /closeQuiz/);
});

test("teacher quiz panel shows participation against present students", () => {
  assert.match(panel, /presentCount/);
  assert.match(panel, /round\.totalAnswers/);
  assert.match(panel, /const pending = Math\.max/);
});

test("teacher can start a new quiz after a closed round", () => {
  assert.match(panel, /Novo Quiz/);
  assert.match(panel, /setCreating\(true\)/);
});
