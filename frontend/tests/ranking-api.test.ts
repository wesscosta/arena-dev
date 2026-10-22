import { readTeacherAppSource } from "./support/teacher-source";
import assert from "node:assert/strict";
import fs from "node:fs";
import test, { afterEach } from "node:test";
import {
  emptyPublicRankingState,
  fetchSessionRanking,
  updateRankingPresentation,
} from "../lib/ranking-api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("loads the authoritative session ranking", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://localhost:8080/api/sessions/session-a/ranking");
    assert.equal(init?.method, undefined);
    return new Response(JSON.stringify({
      sessionId: "session-a",
      presentation: { visible: false, anonymized: false, limit: "TOP_5" },
      hasScoreEvents: true,
      scoredParticipantCount: 2,
      entries: [
        {
          participantId: "p1",
          studentId: "s1",
          fullName: "Ana Silva",
          displayName: "Ana",
          score: 100,
          position: 1,
          hasScoreEvents: true,
          present: true,
          connected: true,
        },
      ],
      generatedAt: "2026-10-05T12:00:00Z",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const state = await fetchSessionRanking("session-a");
  assert.equal(state.entries[0]?.position, 1);
  assert.equal(state.presentation.visible, false);
});

test("updates projector ranking preferences through csrf protected PUT", async () => {
  let commandCalled = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "http://localhost:8080/api/auth/csrf") {
      return new Response(JSON.stringify({ token: "csrf-ranking-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    commandCalled = true;
    assert.equal(url, "http://localhost:8080/api/sessions/session-a/ranking/presentation");
    assert.equal(init?.method, "PUT");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      visible: true,
      anonymized: true,
      limit: "ALL",
    });
    assert.equal(new Headers(init?.headers).get("X-XSRF-TOKEN"), "csrf-ranking-token");

    return new Response(JSON.stringify({
      sessionId: "session-a",
      presentation: { visible: true, anonymized: true, limit: "ALL" },
      hasScoreEvents: true,
      scoredParticipantCount: 2,
      entries: [],
      generatedAt: "2026-10-05T12:00:00Z",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const state = await updateRankingPresentation("session-a", {
    visible: true,
    anonymized: true,
    limit: "ALL",
  });

  assert.equal(commandCalled, true);
  assert.equal(state.presentation.visible, true);
  assert.equal(state.presentation.anonymized, true);
});

test("public ranking empty state never contains participant identity", () => {
  const state = emptyPublicRankingState("session-a");
  assert.equal(state.visible, false);
  assert.equal(state.anonymized, true);
  assert.deepEqual(state.entries, []);
});

test("Arena ranking remains contextual and projector-controlled", () => {
  const app = readTeacherAppSource();
  const panel = fs.readFileSync("components/arena/ranking/RankingPanel.tsx", "utf8");
  const projector = fs.readFileSync("components/ProjectorView.tsx", "utf8");

  assert.match(app, /open={activeTool === "ranking"}/);
  assert.match(panel, /Exibir no projetor/);
  assert.match(panel, /Ocultar do projetor/);
  assert.match(panel, /Ocultar nomes no projetor/);
  assert.match(panel, /Top 5/);
  assert.match(panel, /Todos/);
  assert.match(projector, /PUBLIC_RANKING_STATE/);
  assert.match(projector, /data-testid="projector-session-ranking"/);
});
