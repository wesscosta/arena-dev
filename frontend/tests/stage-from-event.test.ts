import assert from "node:assert/strict";
import test from "node:test";
import { stageFromEvent } from "../lib/material-section-sync";
import { emptyLiveStageState, type LiveStageState } from "../lib/live-stage-api";

// rc.6: the student phone and the projector share one ordering rule, so a
// stage frame delayed on a bad network can no longer roll a phone back.
function stage(version: number, sourceId: string): LiveStageState {
  const base = emptyLiveStageState("session");
  return { ...base, stageVersion: version, primary: { ...base.primary, type: "MATERIAL", sourceId } };
}

test("a LIVE_STAGE_STATE frame older than the shown stage is ignored", () => {
  const shown = stage(5, "current");
  const late = { type: "LIVE_STAGE_STATE", payload: stage(4, "old") };
  assert.equal(stageFromEvent(shown, late).primary.sourceId, "current");
});

test("a newer LIVE_STAGE_STATE frame replaces the shown stage", () => {
  const next = { type: "LIVE_STAGE_STATE", payload: stage(6, "next") };
  assert.equal(stageFromEvent(stage(5, "current"), next).primary.sourceId, "next");
});

test("a RUNTIME_SNAPSHOT carrying an older stage keeps the shown stage", () => {
  const snapshot = { type: "RUNTIME_SNAPSHOT", payload: { stage: stage(3, "old"), buzzer: null } };
  assert.equal(stageFromEvent(stage(5, "current"), snapshot).stageVersion, 5);
});

test("frames without a stage leave it untouched", () => {
  const shown = stage(5, "current");
  assert.equal(stageFromEvent(shown, { type: "BUZZER_STATE", payload: {} }), shown);
  assert.equal(stageFromEvent(shown, { type: "RUNTIME_SNAPSHOT", payload: { buzzer: null } }), shown);
});
