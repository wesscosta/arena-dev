import assert from "node:assert/strict";
import test from "node:test";
import { recoveryGuidance } from "../lib/learning-recovery";
import type { LearningCycleComparison } from "../lib/learning-cycle-api";

const baseline: LearningCycleComparison = {
  cycleId: "cycle", learningTargetId: "target",
  baseline: { responses: 3, comparable: 3 },
  followup: { responses: 3, comparable: 3 }, paired: 3,
  transitions: { correctToCorrect: 0, correctToIncorrect: 0,
    incorrectToCorrect: 0, incorrectToIncorrect: 3 },
  baselineOnly: 0, followupOnly: 0,
  disclaimer: "Mudança no instrumento não comprova mastery.",
};

test("recuperação é sugerida quando erro persiste, nunca declara mastery", () => {
  const value = recoveryGuidance(baseline);
  assert.equal(value.kind, "RETEACH");
  assert.match(value.nextStep, /outra verificação/);
  assert.doesNotMatch(value.explanation, /domínio consolidado/i);
});

test("sem pareamento não se atribui ganho a alunos diferentes", () => {
  assert.equal(recoveryGuidance({ ...baseline, paired: 0 }).kind, "NO_PAIR");
});

test("queda e melhora usam somente transições avaliadas", () => {
  assert.equal(recoveryGuidance({ ...baseline, transitions: {
    ...baseline.transitions, incorrectToIncorrect: 0, correctToIncorrect: 1,
  } }).kind, "INVESTIGATE");
  assert.equal(recoveryGuidance({ ...baseline, transitions: {
    correctToCorrect: 1, correctToIncorrect: 0, incorrectToCorrect: 2, incorrectToIncorrect: 0,
  } }).kind, "PROGRESS");
  assert.equal(recoveryGuidance({ ...baseline, transitions: {
    correctToCorrect: 3, correctToIncorrect: 0, incorrectToCorrect: 0, incorrectToIncorrect: 0,
  } }).kind, "MAINTAIN");
});
