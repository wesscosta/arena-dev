import assert from "node:assert/strict";
import test from "node:test";
import { deriveQuizFeedback } from "../lib/quiz-feedback";
import type { QuizRound } from "../lib/quiz-api";

function round(overrides: Partial<QuizRound> = {}): QuizRound {
  return {
    id: "round-1",
    sessionId: "session-1",
    status: "LOCKED",
    question: {
      id: "question-1",
      type: "MULTIPLE_CHOICE",
      statement: "Qual alternativa está correta?",
      points: 10,
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
        { id: "c", text: "C" },
        { id: "d", text: "D" },
      ],
    },
    totalAnswers: 10,
    publicResultsVisible: false,
    correctAnswer: "a",
    distribution: [
      { optionId: "a", label: "A", answerCount: 6, percentage: 60 },
      { optionId: "b", label: "B", answerCount: 3, percentage: 30 },
      { optionId: "c", label: "C", answerCount: 1, percentage: 10 },
      { optionId: "d", label: "D", answerCount: 0, percentage: 0 },
    ],
    createdAt: "2026-09-11T20:00:00Z",
    updatedAt: "2026-09-11T20:01:00Z",
    ...overrides,
  };
}

test("derives correct, incorrect and accuracy from teacher quiz projection", () => {
  const feedback = deriveQuizFeedback(round());
  assert.ok(feedback);
  assert.equal(feedback.correctAnswers, 6);
  assert.equal(feedback.incorrectAnswers, 4);
  assert.equal(feedback.accuracyPercentage, 60);
  assert.equal(feedback.topDistractor?.optionId, "b");
});

test("true-false maps boolean correct answer to the option id", () => {
  const feedback = deriveQuizFeedback(round({
    question: {
      id: "question-2",
      type: "TRUE_FALSE",
      statement: "Verdadeiro?",
      points: 5,
      options: [
        { id: "true", text: "Verdadeiro" },
        { id: "false", text: "Falso" },
      ],
    },
    totalAnswers: 5,
    correctAnswer: true,
    distribution: [
      { optionId: "true", label: "Verdadeiro", answerCount: 4, percentage: 80 },
      { optionId: "false", label: "Falso", answerCount: 1, percentage: 20 },
    ],
  }));
  assert.ok(feedback);
  assert.equal(feedback.correctAnswers, 4);
  assert.equal(feedback.incorrectAnswers, 1);
  assert.equal(feedback.topDistractor?.optionId, "false");
});

test("zero-count distractors do not become pedagogical noise", () => {
  const feedback = deriveQuizFeedback(round({
    totalAnswers: 3,
    distribution: [
      { optionId: "a", label: "A", answerCount: 3, percentage: 100 },
      { optionId: "b", label: "B", answerCount: 0, percentage: 0 },
      { optionId: "c", label: "C", answerCount: 0, percentage: 0 },
      { optionId: "d", label: "D", answerCount: 0, percentage: 0 },
    ],
  }));
  assert.ok(feedback);
  assert.equal(feedback.distractors.length, 0);
  assert.equal(feedback.topDistractor, null);
});

test("missing private correction prevents derived pedagogical feedback", () => {
  assert.equal(deriveQuizFeedback(round({ correctAnswer: null })), null);
});
