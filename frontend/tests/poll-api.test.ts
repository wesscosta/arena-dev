import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { createPoll, fetchPollState, revealPoll, sendPollVote } from "../lib/poll-api";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("loads the authoritative poll state", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://localhost:8080/api/sessions/session-a/poll");
    assert.equal(init?.method, undefined);
    return new Response(JSON.stringify({ round: null }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  assert.equal((await fetchPollState("session-a")).round, null);
});

test("creates a protected poll through csrf protected command", async () => {
  let called = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "http://localhost:8080/api/auth/csrf") {
      return new Response(JSON.stringify({ token: "csrf-test-token" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    called = true;
    assert.equal(url, "http://localhost:8080/api/sessions/session-a/poll");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), { prompt: "Qual linguagem?", options: ["Java", "Python"], liveResults: false });
    return new Response(JSON.stringify({ round: { id: "round-a", status: "OPEN" } }), { status: 201, headers: { "Content-Type": "application/json" } });
  };
  const state = await createPoll("session-a", { prompt: "Qual linguagem?", options: ["Java", "Python"], liveResults: false });
  assert.equal(called, true);
  assert.equal(state.round?.id, "round-a");
});

test("reveals a protected poll", async () => {
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "http://localhost:8080/api/auth/csrf") {
      return new Response(JSON.stringify({ token: "csrf-test-token" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    assert.equal(url, "http://localhost:8080/api/sessions/session-a/poll/round-a/reveal");
    assert.equal(init?.method, "POST");
    return new Response(JSON.stringify({ round: { id: "round-a", status: "REVEALED", publicResultsVisible: true } }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  assert.equal((await revealPoll("session-a", "round-a")).round?.status, "REVEALED");
});

test("sends votes only through an open authenticated websocket", () => {
  const frames: string[] = [];
  const socket = { readyState: WebSocket.OPEN, send: (frame: string) => frames.push(frame) } as unknown as WebSocket;
  assert.equal(sendPollVote(socket, "option-a"), true);
  assert.deepEqual(JSON.parse(frames[0]), { type: "POLL_VOTE", optionId: "option-a" });
});
