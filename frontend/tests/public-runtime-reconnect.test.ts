import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { reconnectDelayMs } from "../lib/runtime-snapshot";

const joinSource = readFileSync(resolve(process.cwd(), "app/join/page.tsx"), "utf8");
const projectorSource = readFileSync(resolve(process.cwd(), "components/ProjectorView.tsx"), "utf8");
const publicStyles = readFileSync(resolve(process.cwd(), "styles/public-live.css"), "utf8");

test("reconnect backoff grows but stays capped", () => {
  assert.equal(reconnectDelayMs(0), 1000);
  assert.equal(reconnectDelayMs(1), 2000);
  assert.equal(reconnectDelayMs(2), 4000);
  assert.equal(reconnectDelayMs(3), 8000);
  assert.equal(reconnectDelayMs(4), 10000);
  assert.equal(reconnectDelayMs(12), 10000);
});

test("participant reconnect restores one atomic runtime snapshot before interactions resume", () => {
  assert.match(joinSource, /event\.type === "RUNTIME_SNAPSHOT"/);
  assert.match(joinSource, /setBuzzerParticipant\(runtime\.buzzerParticipant\)/);
  assert.match(joinSource, /setWordCloudParticipant\(runtime\.wordCloudParticipant\)/);
  assert.match(joinSource, /setPollParticipant\(runtime\.pollParticipant\)/);
  assert.match(joinSource, /event\.type === "AUTH_OK"/);
  assert.match(joinSource, /setSocketState\("online"\)/);
  assert.doesNotMatch(joinSource, /socket\.onopen = \(\) => \{ if \(active\) setSocketState\("online"\)/);
});

test("participant auth failure can recover through remembered opaque device claim", () => {
  assert.match(joinSource, /recoverParticipantAccess/);
  assert.match(joinSource, /joinRememberedDevice\(session\.code, rememberedToken\)/);
  assert.match(joinSource, /event\.type === "AUTH_FAILED"/);
});

test("projector keeps last stage while reconnecting and consumes atomic runtime snapshot", () => {
  assert.match(projectorSource, /event\.type === "RUNTIME_SNAPSHOT"/);
  assert.match(projectorSource, /setConnection\("reconnecting"\)/);
  assert.match(projectorSource, /Mantendo o último palco enquanto reconectamos/);
});

test("public boss presentation exposes synchronized HP without creating another runtime", () => {
  assert.match(joinSource, /boss\.currentHp/);
  assert.match(projectorSource, /bossState\.currentHp/);
  assert.match(publicStyles, /public-live-boss__track/);
});
