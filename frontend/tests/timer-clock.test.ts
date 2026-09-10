import assert from "node:assert/strict";
import test from "node:test";
import {
  effectiveTimerStatus,
  estimatedServerNowMs,
  formatTimer,
  splitTimerDuration,
  timerDurationFromParts,
  timerRemainingSeconds,
} from "../lib/timer-clock";
import type { SessionTimer, TimerState } from "../lib/timer-api";

function runningTimer(overrides: Partial<SessionTimer> = {}): SessionTimer {
  return {
    id: "timer-1",
    sessionId: "session-1",
    title: "Pesquisa",
    instructions: null,
    status: "RUNNING",
    durationSeconds: 600,
    remainingSeconds: 600,
    startedAt: "2026-09-05T15:00:00Z",
    endsAt: "2026-09-05T15:10:00Z",
    pausedAt: null,
    finishedAt: null,
    createdAt: "2026-09-05T15:00:00Z",
    updatedAt: "2026-09-05T15:00:00Z",
    ...overrides,
  };
}

test("formats classroom timer values", () => {
  assert.equal(formatTimer(0), "00:00");
  assert.equal(formatTimer(65), "01:05");
  assert.equal(formatTimer(3661), "01:01:01");
});

test("derives countdown from authoritative endsAt", () => {
  const state: TimerState = { timer: runningTimer() };
  const now = Date.parse("2026-09-05T15:04:30Z");
  assert.equal(timerRemainingSeconds(state, now), 330);
});

test("compensates client clock skew with realtime server anchor", () => {
  const state: TimerState = {
    timer: runningTimer(),
    serverOccurredAt: "2026-09-05T15:04:00Z",
    receivedAtMs: Date.parse("2026-09-05T18:04:00Z"),
  };
  const clientNow = Date.parse("2026-09-05T18:04:15Z");

  assert.equal(
    estimatedServerNowMs(state, clientNow),
    Date.parse("2026-09-05T15:04:15Z"),
  );
  assert.equal(timerRemainingSeconds(state, clientNow), 345);
});

test("keeps paused value stable and marks elapsed running timer as finished for UI", () => {
  const paused = runningTimer({
    status: "PAUSED",
    remainingSeconds: 77,
    endsAt: null,
  });
  assert.equal(timerRemainingSeconds({ timer: paused }, Date.now() + 999999), 77);

  const elapsed = runningTimer({ endsAt: "2026-09-05T15:00:01Z" });
  const remaining = timerRemainingSeconds(
    { timer: elapsed },
    Date.parse("2026-09-05T15:01:00Z"),
  );
  assert.equal(remaining, 0);
  assert.equal(effectiveTimerStatus(elapsed, remaining), "FINISHED");
});

test("converts hour minute second editor values without exceeding 24 hours", () => {
  assert.deepEqual(splitTimerDuration(3723), {
    hours: 1,
    minutes: 2,
    seconds: 3,
  });
  assert.equal(
    timerDurationFromParts({ hours: 1, minutes: 2, seconds: 3 }),
    3723,
  );
  assert.equal(
    timerDurationFromParts({ hours: 24, minutes: 59, seconds: 59 }),
    86400,
  );
});
