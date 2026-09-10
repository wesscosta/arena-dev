import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  activateLiveStage,
  emptyLiveStageState,
  fetchLiveStageState,
} from "../lib/live-stage-api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("represents an idle live stage without feature flags", () => {
  const state = emptyLiveStageState("session-a");

  assert.equal(state.sessionId, "session-a");
  assert.equal(state.primary.type, "IDLE");
  assert.equal(state.overlays.timer, true);
  assert.equal(state.audience, "BOTH");
  assert.equal(state.primary.step, null);
});

test("fetches the authoritative stage state", async () => {
  globalThis.fetch = async (input) => {
    assert.equal(
      String(input),
      "http://localhost:8080/api/sessions/session-a/stage",
    );

    return new Response(JSON.stringify({
      sessionId: "session-a",
      primary: {
        type: "QUESTION",
        sourceId: "step-a",
        displayName: null,
        step: {
          id: "step-a",
          title: "Diagnóstico",
          instructions: "Discuta antes de responder.",
          slideContent: null,
          question: {
            id: "question-a",
            type: "MULTIPLE_CHOICE",
            statement: "Qual verbo HTTP realiza leitura?",
            points: 10,
            options: [
              { id: "A", text: "GET" },
              { id: "B", text: "DELETE" },
            ],
            code: null,
            language: null,
          },
        },
        activatedAt: "2026-09-08T18:00:00Z",
      },
      overlays: { timer: true },
      audience: "BOTH",
      occurredAt: "2026-09-08T18:00:00Z",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const state = await fetchLiveStageState("session-a");
  assert.equal(state.primary.type, "QUESTION");
  assert.equal(state.primary.step?.question?.statement, "Qual verbo HTTP realiza leitura?");
  assert.equal(state.primary.step?.question?.options[0]?.text, "GET");
});

test("activates a stage with explicit audience through csrf protected command", async () => {
  let commandCalled = false;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "http://localhost:8080/api/auth/csrf") {
      return new Response(JSON.stringify({ token: "csrf-stage-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    commandCalled = true;
    assert.equal(
      url,
      "http://localhost:8080/api/sessions/session-a/stage",
    );
    assert.equal(init?.method, "PUT");
    assert.equal(
      (init?.headers as Headers).get("X-XSRF-TOKEN"),
      "csrf-stage-token",
    );
    assert.equal(
      init?.body,
      JSON.stringify({
        type: "WORD_CLOUD",
        sourceId: "round-a",
        audience: "BOTH",
      }),
    );

    return new Response(JSON.stringify({
      sessionId: "session-a",
      primary: { type: "WORD_CLOUD", sourceId: "round-a" },
      overlays: { timer: true },
      audience: "BOTH",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const state = await activateLiveStage("session-a", {
    type: "WORD_CLOUD",
    sourceId: "round-a",
    audience: "BOTH",
  });

  assert.equal(commandCalled, true);
  assert.equal(state.primary.type, "WORD_CLOUD");
});
