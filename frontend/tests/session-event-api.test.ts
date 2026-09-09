import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  fetchSessionEvents,
  fetchSessionEventsBySession,
} from "../lib/session-event-api";

const originalFetch = globalThis.fetch;
const timelineSource = readFileSync(
  resolve(process.cwd(), "components/SessionTimeline.tsx"),
  "utf8",
);
const arenaSource = readFileSync(
  resolve(process.cwd(), "components/ArenaApp.tsx"),
  "utf8",
);

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("loads the classroom operational timeline with a bounded limit", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(
      String(input),
      "http://localhost:8080/api/session-events?classroomId=classroom-a&limit=500",
    );
    assert.equal(init?.credentials, "include");

    return new Response(JSON.stringify([
      {
        id: "event-a",
        sequenceNo: 42,
        sessionId: "session-a",
        classroomId: "classroom-a",
        sessionTitle: "Aula 01",
        eventType: "POLL_OPENED",
        actor: "TEACHER",
        summary: "Votação aberta: Qual caminho seguir?",
        payload: { optionCount: 2 },
        occurredAt: "2026-09-09T12:00:00Z",
      },
    ]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const events = await fetchSessionEvents("classroom-a", 9999);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.eventType, "POLL_OPENED");
  assert.equal(events[0]?.sequenceNo, 42);
});

test("loads one session timeline in chronological endpoint order", async () => {
  globalThis.fetch = async (input) => {
    assert.equal(
      String(input),
      "http://localhost:8080/api/sessions/session-a/events",
    );
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  assert.deepEqual(await fetchSessionEventsBySession("session-a"), []);
});

test("keeps operational timeline separate from reversible XP history", () => {
  assert.match(arenaSource, /id: "timeline", label: "Linha do tempo"/);
  assert.match(arenaSource, /id: "xp", label: "Histórico de XP"/);
  assert.match(arenaSource, /<SessionTimeline classroomId=\{classroomId\} \/>/);
  assert.match(arenaSource, /onReverse/);
});

test("timeline exposes actor context without announcing the whole historical list", () => {
  assert.match(timelineSource, /TEACHER: "Professor"/);
  assert.match(timelineSource, /SYSTEM: "Sistema"/);
  assert.doesNotMatch(timelineSource, /className=\{styles\.timeline\} aria-live=/);
});
