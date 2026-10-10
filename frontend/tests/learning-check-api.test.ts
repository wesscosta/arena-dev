import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  emptyLearningCheckParticipantState,
  repeatLearningCheck,
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
    selfConfidence: null,
  });
});


test("repeats a learning check as a new run through the teacher route", async () => {
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "http://localhost:8080/api/auth/csrf") {
      return new Response(JSON.stringify({ token: "csrf-test-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    assert.equal(
      url,
      "http://localhost:8080/api/sessions/session-a/learning-checks/run-a/repeat",
    );
    assert.equal(init?.method, "POST");
    return new Response(JSON.stringify({
      run: {
        id: "run-b",
        status: "ACTIVE",
        sequence: 2,
        acceptsResponses: true,
        resultsVisiblePublicly: false,
      },
      definition: {
        id: "definition-a",
        prompt: "Qual JOIN preserva a tabela da esquerda?",
        learningTargetId: "target-a",
        learningTargetTitle: "Identificar LEFT JOIN",
        options: [
          { key: "a", label: "INNER JOIN", position: 0 },
          { key: "b", label: "LEFT JOIN", position: 1 },
        ],
      },
      result: {
        runId: "run-b",
        sessionId: "session-a",
        interactionDefinitionId: "definition-a",
        responseKind: "CHOICE",
        evaluationMode: "CORRECT_ANSWER",
        participation: {
          participantCount: 1,
          responseCount: 0,
          participationRate: 0,
        },
        choiceDistribution: { a: 0, b: 0 },
        evaluation: {
          evaluationCount: 0,
          correctCount: 0,
          incorrectCount: 0,
          partialCount: 0,
          notEvaluatedCount: 0,
          accuracy: null,
        },
      },
      evidenceCount: 0,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const state = await repeatLearningCheck("session-a", "run-a");

  assert.equal(state.run?.id, "run-b");
  assert.equal(state.run?.sequence, 2);
  assert.equal(state.run?.status, "ACTIVE");
  assert.equal(state.run?.acceptsResponses, true);
  assert.equal(state.evidenceCount, 0);
});
