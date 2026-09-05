import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  fetchProjectorSnapshot,
  projectorSocketUrl,
} from "../lib/projector-api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("projector snapshot normalizes code and remains anonymous", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://localhost:8080/api/projector/AB12CD");
    assert.equal(init?.credentials, "omit");

    return new Response(JSON.stringify({
      sessionId: "session-a",
      classroomName: "Turma A",
      sessionTitle: "Aula",
      code: "AB12CD",
      expiresAt: "2026-09-06T03:00:00Z",
      serverTime: "2026-09-05T18:00:00Z",
      timer: null,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const snapshot = await fetchProjectorSnapshot(" ab12cd ");
  assert.equal(snapshot.sessionId, "session-a");
  assert.equal(snapshot.code, "AB12CD");
});

test("projector websocket uses the dedicated public audience path", () => {
  assert.equal(
    projectorSocketUrl("session-a"),
    "ws://localhost:8080/ws/projector/session-a",
  );
});
