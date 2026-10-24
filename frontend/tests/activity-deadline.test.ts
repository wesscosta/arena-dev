import test from "node:test";
import assert from "node:assert/strict";
import { countdownSeconds, formatRemaining } from "../lib/activity-deadline";

test("prazo informado pelo servidor é estável e não usa Date.now do dispositivo", () => {
  const initial = "2026-10-24T15:00:00.000Z";
  const deadline = "2026-10-24T15:20:00.000Z";
  assert.equal(countdownSeconds(deadline, initial, 0), 1200);
  assert.equal(countdownSeconds(deadline, initial, 600_000), 600);
  assert.equal(countdownSeconds(deadline, initial, 1_200_000), 0);
  assert.equal(countdownSeconds(deadline, initial, 1_800_000), 0);
});

test("cronômetro formata minutos e horas e trata entradas inválidas", () => {
  assert.equal(formatRemaining(61), "01:01");
  assert.equal(formatRemaining(3661), "1:01:01");
  assert.equal(formatRemaining(0), "00:00");
  assert.equal(countdownSeconds("invalid", "2026-10-24", 0), 0);
});
