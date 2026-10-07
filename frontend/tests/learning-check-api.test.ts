import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  emptyLearningCheckParticipantState,
  submitLearningCheckAnswer,
} from "../lib/learning-check-api";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("submits a learning check answer through the public participant route", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(
      String(input),
      "http://localhost:8080/api/join/ABC123/learning-check/run-a/answer",
    );
    assert.equal(init?.method, "POST");
    assert.equal(init?.credentials, "omit");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      token: "participant-token",
      optionKey: "b",
    });
    return new Response(JSON.stringify({
      runId: "run-a",
      status: "ACTIVE",
      prompt: "Qual JOIN preserva a tabela da esquerda?",
      learningTargetId: "target-a",
      learningTargetTitle: "Identificar LEFT JOIN",
      options: [
        { key: "a", label: "INNER JOIN", position: 0 },
        { key: "b", label: "LEFT JOIN", position: 1 },
      ],
      acceptsResponses: true,
      answered: true,
      selectedOptionKey: "b",
      resultsVisiblePublicly: false,
      correctOptionKey: null,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const state = await submitLearningCheckAnswer(
    "abc123",
    "run-a",
    "participant-token",
    "b",
  );

  assert.equal(state.answered, true);
  assert.equal(state.selectedOptionKey, "b");
  assert.equal(state.correctOptionKey, null);
});

test("empty learning check participant state never exposes correction", () => {
  assert.deepEqual(emptyLearningCheckParticipantState(), {
    runId: null,
    status: null,
    prompt: null,
    learningTargetId: null,
    learningTargetTitle: null,
    options: [],
    acceptsResponses: false,
    answered: false,
    selectedOptionKey: null,
    resultsVisiblePublicly: false,
    correctOptionKey: null,
  });
});
