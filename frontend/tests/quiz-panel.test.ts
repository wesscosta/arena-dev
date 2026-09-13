import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const panel = readFileSync(resolve(process.cwd(), "components/QuizPanel.tsx"), "utf8");
const arena = readFileSync(resolve(process.cwd(), "components/ArenaApp.tsx"), "utf8");

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

test("13.5 exposes four explicit pedagogical decisions", () => {
  assert.match(panel, />\s*Continuar\s*</);
  assert.match(panel, />\s*Reexplicar\s*</);
  assert.match(panel, />\s*Refazer questão\s*</);
  assert.match(panel, />\s*Abrir discussão\s*</);
});

test("retry prepares the same question without automatically reopening answers", () => {
  const retry = panel.slice(
    panel.indexOf("async function retryQuestion"),
    panel.indexOf("function project"),
  );
  assert.match(retry, /prepareQuiz\(sessionId, round\.question\.id\)/);
  assert.doesNotMatch(retry, /openQuiz/);
});

test("continue advances Live Flow only through explicit teacher callback", () => {
  assert.match(panel, /canAdvanceFlow && onContinue/);
  assert.match(arena, /onContinue=\{\(\) => movePreparedFlow\("next"\)\}/);
  assert.match(arena, /canAdvanceFlow=\{Boolean\(liveFlowState\?\.started && liveFlowState\.hasNext\)\}/);
});
