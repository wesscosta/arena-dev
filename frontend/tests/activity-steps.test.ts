import assert from "node:assert/strict";
import test from "node:test";
import {
  createActivityStep,
  moveActivityStep,
  nextPollOptionId,
  validateActivitySteps,
} from "../lib/activity-steps";
import type { ActivityQuestion, ActivityStep } from "../lib/types";

const question: ActivityQuestion = {
  id: "24b29e6b-3fb7-42eb-980b-52e3ebda4827",
  type: "OPEN",
  statement: "O que é uma API?",
  difficulty: "INTERMEDIATE",
  points: 10,
};

test("creates initial drafts for all live flow step types", () => {
  assert.equal(createActivityStep("SLIDE").type, "SLIDE");
  assert.equal(createActivityStep("QUESTION", [question]).questionId, question.id);
  assert.equal(createActivityStep("WORD_CLOUD").wordCloud?.maxWordsPerParticipant, 1);
  assert.equal(createActivityStep("POLL").poll?.options.length, 2);
});

test("moves steps and recalculates positions", () => {
  const steps: ActivityStep[] = [
    { position: 0, type: "SLIDE", slideContent: "A" },
    {
      position: 1,
      type: "WORD_CLOUD",
      wordCloud: {
        prompt: "B",
        maxWordsPerParticipant: 1,
        liveReveal: false,
      },
    },
  ];

  const moved = moveActivityStep(steps, 1, -1);

  assert.equal(moved[0].type, "WORD_CLOUD");
  assert.deepEqual(moved.map((step) => step.position), [0, 1]);
});

test("validates question ownership and poll configuration", () => {
  const steps: ActivityStep[] = [
    { position: 0, type: "QUESTION", questionId: "missing" },
    {
      position: 1,
      type: "POLL",
      poll: {
        prompt: "",
        liveResults: false,
        options: [{ id: "A", text: "" }],
      },
    },
  ];

  const errors = validateActivitySteps(steps, [question]);

  assert.ok(errors.some((error) => error.includes("não pertence à atividade")));
  assert.ok(errors.some((error) => error.includes("pergunta da votação")));
  assert.ok(errors.some((error) => error.includes("entre 2 e 6 opções")));
});

test("picks the next available poll option identifier", () => {
  assert.equal(
    nextPollOptionId([
      { id: "A", text: "A" },
      { id: "B", text: "B" },
      { id: "D", text: "D" },
    ]),
    "C",
  );
});
