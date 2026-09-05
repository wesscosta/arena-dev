import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchActivitySteps,
  replaceActivitySteps,
} from "../lib/activity-step-api";

test("fetches the authored live flow for an activity", async () => {
  globalThis.fetch = async (input) => {
    assert.equal(
      String(input),
      "http://localhost:8080/api/activities/activity-a/steps",
    );

    return new Response(
      JSON.stringify([
        {
          id: "step-a",
          position: 0,
          type: "SLIDE",
          title: "Abertura",
          instructions: null,
          questionId: null,
          slideContent: "# APIs",
          wordCloud: null,
          poll: null,
        },
      ]),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  const steps = await fetchActivitySteps("activity-a");

  assert.equal(steps.length, 1);
  assert.equal(steps[0].type, "SLIDE");
});

test("replaces the flow using csrf protected PUT", async () => {
  let operationCalled = false;

  globalThis.fetch = async (input, init) => {
    const url = String(input);

    if (url === "http://localhost:8080/api/auth/csrf") {
      return new Response(JSON.stringify({ token: "csrf-step-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    operationCalled = true;
    assert.equal(
      url,
      "http://localhost:8080/api/activities/activity-a/steps",
    );
    assert.equal(init?.method, "PUT");

    return new Response(
      JSON.stringify([
        {
          id: "step-cloud",
          position: 0,
          type: "WORD_CLOUD",
          title: "Síntese",
          instructions: null,
          questionId: null,
          slideContent: null,
          wordCloud: {
            prompt: "Uma palavra sobre API",
            maxWordsPerParticipant: 3,
            liveReveal: false,
          },
          poll: null,
        },
      ]),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  const steps = await replaceActivitySteps("activity-a", [
    {
      position: 0,
      type: "WORD_CLOUD",
      title: "Síntese",
      wordCloud: {
        prompt: "Uma palavra sobre API",
        maxWordsPerParticipant: 3,
        liveReveal: false,
      },
    },
  ]);

  assert.equal(operationCalled, true);
  assert.equal(steps[0].id, "step-cloud");
});
