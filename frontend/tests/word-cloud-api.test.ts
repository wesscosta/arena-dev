import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  createWordCloud,
  fetchWordCloudState,
  revealWordCloud,
} from "../lib/word-cloud-api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("loads teacher word cloud state from the active session", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://localhost:8080/api/sessions/session-a/word-cloud");
    assert.equal(init?.method, undefined);
    return new Response(JSON.stringify({ round: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const state = await fetchWordCloudState("session-a");
  assert.equal(state.round, null);
});

test("creates a word cloud round with the selected participation mode", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://localhost:8080/api/sessions/session-a/word-cloud");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      prompt: "Uma palavra sobre API",
      liveReveal: false,
      maxWordsPerParticipant: 3,
    });
    return new Response(JSON.stringify({ round: { id: "round-a" } }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  };

  const state = await createWordCloud("session-a", {
    prompt: "Uma palavra sobre API",
    liveReveal: false,
    maxWordsPerParticipant: 3,
  });
  assert.equal(state.round?.id, "round-a");
});

test("reveals an existing word cloud round", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://localhost:8080/api/sessions/session-a/word-cloud/round-a/reveal");
    assert.equal(init?.method, "POST");
    return new Response(JSON.stringify({
      round: { id: "round-a", status: "REVEALED" },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const state = await revealWordCloud("session-a", "round-a");
  assert.equal(state.round?.status, "REVEALED");
});
