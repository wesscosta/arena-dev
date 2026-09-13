import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { emptyQuizParticipantState, sendQuizAnswer } from "../lib/quiz-api";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("submits a quiz answer through the public join route without teacher csrf", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(
      String(input),
      "http://localhost:8080/api/join/ABC123/quiz/round-a/answer",
    );
    assert.equal(init?.method, "POST");
    assert.equal(init?.credentials, "omit");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      token: "participant-token",
      answer: "a",
    });
    return new Response(JSON.stringify({
      roundId: "round-a",
      status: "OPEN",
      canAnswer: true,
      answered: true,
      answer: "a",
      resultsVisible: false,
      correctAnswer: null,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const state = await sendQuizAnswer("abc123", "round-a", "participant-token", "a");
  assert.equal(state.answered, true);
  assert.equal(state.answer, "a");
  assert.equal(state.correctAnswer, null);
});

test("keeps false as a valid structured true-false answer", async () => {
  globalThis.fetch = async (_input, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), {
      token: "participant-token",
      answer: false,
    });
    return new Response(JSON.stringify({
      roundId: "round-b",
      status: "OPEN",
      canAnswer: true,
      answered: true,
      answer: false,
      resultsVisible: false,
      correctAnswer: null,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const state = await sendQuizAnswer("ABC123", "round-b", "participant-token", false);
  assert.equal(state.answer, false);
});

test("empty participant quiz state never exposes a correction", () => {
  assert.deepEqual(emptyQuizParticipantState(), {
    roundId: null,
    status: null,
    canAnswer: false,
    answered: false,
    answer: null,
    resultsVisible: false,
    correctAnswer: null,
    submittedAt: null,
    updatedAt: null,
  });
});
