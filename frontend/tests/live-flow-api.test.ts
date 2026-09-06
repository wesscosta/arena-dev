import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchLiveFlow,
  nextLiveFlow,
  startLiveFlow,
} from "../lib/mechanics-api";

const liveFlowPayload = {
  sessionId: "session-a",
  activityId: "activity-a",
  activityTitle: "Aula de APIs",
  steps: [
    {
      id: "step-1",
      position: 0,
      type: "SLIDE",
      title: "Abertura",
      instructions: null,
      questionId: null,
      slideContent: "# APIs",
      wordCloud: null,
      poll: null,
    },
  ],
  currentIndex: null,
  started: false,
  hasPrevious: false,
  hasNext: true,
};

const runtimePayload = {
  sessionId: "session-a",
  drawCounts: {},
  lastDrawnStudentId: null,
  boss: null,
  activityId: "activity-a",
  currentQuestionId: null,
  answeredQuestionIds: [],
  currentStepId: "step-1",
  currentStepPosition: 0,
  groups: [],
  groupSize: 2,
};

test("fetches the authoritative live flow state", async () => {
  globalThis.fetch = async (input) => {
    assert.equal(
      String(input),
      "http://localhost:8080/api/sessions/session-a/mechanics/arena/flow",
    );
    return new Response(JSON.stringify(liveFlowPayload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const flow = await fetchLiveFlow("session-a");

  assert.equal(flow.activityId, "activity-a");
  assert.equal(flow.steps.length, 1);
  assert.equal(flow.started, false);
});

test("starts the live flow using csrf protected command", async () => {
  let commandCalled = false;

  globalThis.fetch = async (input, init) => {
    const url = String(input);

    if (url === "http://localhost:8080/api/auth/csrf") {
      return new Response(JSON.stringify({ token: "csrf-flow-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    commandCalled = true;
    assert.equal(
      url,
      "http://localhost:8080/api/sessions/session-a/mechanics/arena/flow/start",
    );
    assert.equal(init?.method, "POST");

    return new Response(
      JSON.stringify({
        liveFlow: {
          ...liveFlowPayload,
          currentIndex: 0,
          started: true,
          hasNext: false,
        },
        runtime: runtimePayload,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  const result = await startLiveFlow("session-a");

  assert.equal(commandCalled, true);
  assert.equal(result.liveFlow.currentIndex, 0);
  assert.equal(result.runtime.currentStepPosition, 0);
});

test("moves to the next step through the backend command", async () => {
  let commandCalled = false;

  globalThis.fetch = async (input, init) => {
    const url = String(input);

    if (url === "http://localhost:8080/api/auth/csrf") {
      return new Response(JSON.stringify({ token: "csrf-flow-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    commandCalled = true;
    assert.equal(
      url,
      "http://localhost:8080/api/sessions/session-a/mechanics/arena/flow/next",
    );
    assert.equal(init?.method, "POST");

    return new Response(
      JSON.stringify({
        liveFlow: {
          ...liveFlowPayload,
          currentIndex: 0,
          started: true,
          hasNext: false,
        },
        runtime: runtimePayload,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  const result = await nextLiveFlow("session-a");

  assert.equal(commandCalled, true);
  assert.equal(result.liveFlow.started, true);
});
