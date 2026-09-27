import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const app = readFileSync(resolve(process.cwd(), "components/ArenaApp.tsx"), "utf8");
const manager = readFileSync(resolve(process.cwd(), "components/JourneyManager.tsx"), "utf8");
const api = readFileSync(resolve(process.cwd(), "lib/journey-api.ts"), "utf8");

test("classroom workspace exposes Journey Core as its own tab", () => {
  assert.match(app, /"journeys"/);
  assert.match(app, /label: "Jornadas"/);
  assert.match(app, /<JourneyManager/);
});

test("Journey Core editor keeps ordering and completion rules explicit", () => {
  assert.match(manager, /PREVIOUS_STAGE_COMPLETED/);
  assert.match(manager, /ACTIVITY_SUBMITTED/);
  assert.match(manager, /ACTIVITY_GRADED/);
  assert.match(manager, /moveStage/);
  assert.match(manager, /A primeira etapa fica disponível imediatamente/);
});

test("published journey structure is protected in the teacher editor", () => {
  assert.match(manager, /const structuralLocked = draft\?\.status !== "DRAFT"/);
  assert.match(manager, /Estrutura protegida após publicação/);
  assert.match(manager, /publishJourney/);
  assert.match(manager, /archiveJourney/);
});

test("journey API exposes draft authoring and lifecycle endpoints", () => {
  assert.match(api, /\/api\/journeys\?classroomId=/);
  assert.match(api, /\/publish/);
  assert.match(api, /\/archive/);
  assert.match(api, /JourneyCompletionRule/);
});
