import assert from "node:assert/strict";
import test from "node:test";
import {
  attachHeartbeat,
  HEARTBEAT_CLOSE_CODE,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
} from "../lib/realtime-heartbeat";

type Timer = { at: number; every?: number; run: () => void };

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, Timer>();
  const resumeCallbacks = new Set<() => void>();
  const env = {
    setInterval: (run: () => void, ms: number) => { timers.set(nextId, { at: now + ms, every: ms, run }); return nextId++; },
    clearInterval: (id: number) => { timers.delete(id); },
    setTimeout: (run: () => void, ms: number) => { timers.set(nextId, { at: now + ms, run }); return nextId++; },
    clearTimeout: (id: number) => { timers.delete(id); },
    onResume: (callback: () => void) => { resumeCallbacks.add(callback); return () => resumeCallbacks.delete(callback); },
  };
  function advance(ms: number) {
    const target = now + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      const [id, timer] = due;
      now = timer.at;
      if (timer.every) timer.at += timer.every; else timers.delete(id);
      timer.run();
    }
    now = target;
  }
  return { env, advance, resume: () => resumeCallbacks.forEach((callback) => callback()), timers };
}

function fakeSocket() {
  const listeners = new Map<string, Array<() => void>>();
  const sent: string[] = [];
  const socket = {
    readyState: 0,
    closedWith: undefined as number | undefined,
    send: (data: string) => { sent.push(data); },
    close: (code?: number) => { socket.closedWith = code; socket.readyState = 3; emit("close"); },
    addEventListener: (type: string, listener: () => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
  };
  function emit(type: string) { (listeners.get(type) ?? []).forEach((listener) => listener()); }
  return { socket, sent, emit, open: () => { socket.readyState = 1; emit("open"); } };
}

test("rc.5 heartbeat pings while open and keeps a live connection", () => {
  const clock = fakeClock();
  const { socket, sent, emit, open } = fakeSocket();
  attachHeartbeat(socket as unknown as WebSocket, clock.env);
  open();
  clock.advance(HEARTBEAT_INTERVAL_MS);
  assert.deepEqual(sent, [JSON.stringify({ type: "PING" })]);
  emit("message"); // PONG
  clock.advance(HEARTBEAT_TIMEOUT_MS * 2);
  assert.equal(socket.closedWith, undefined);
});

test("rc.5 heartbeat closes a half-open socket so the client reconnects", () => {
  const clock = fakeClock();
  const { socket, open } = fakeSocket();
  attachHeartbeat(socket as unknown as WebSocket, clock.env);
  open();
  clock.advance(HEARTBEAT_INTERVAL_MS + HEARTBEAT_TIMEOUT_MS);
  assert.equal(socket.closedWith, HEARTBEAT_CLOSE_CODE);
  assert.notEqual(HEARTBEAT_CLOSE_CODE, 1008, "1008 stops reconnection on the student client");
  assert.equal(clock.timers.size, 0, "timers are released on close");
});

test("rc.5 heartbeat probes immediately when the page resumes", () => {
  const clock = fakeClock();
  const { socket, sent, open } = fakeSocket();
  attachHeartbeat(socket as unknown as WebSocket, clock.env);
  open();
  clock.resume();
  assert.equal(sent.length, 1);
  clock.advance(HEARTBEAT_TIMEOUT_MS);
  assert.equal(socket.closedWith, HEARTBEAT_CLOSE_CODE);
});
