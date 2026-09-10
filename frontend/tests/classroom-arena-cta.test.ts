import assert from "node:assert/strict";
import test from "node:test";
import { classroomArenaCtaState } from "../lib/classroom-arena-cta";

test("shows start action for an active classroom without a live session", () => {
  const state = classroomArenaCtaState(true);

  assert.equal(state.buttonLabel, "Iniciar Arena");
  assert.equal(state.live, false);
  assert.equal(state.disabled, false);
});

test("shows continue action when the classroom already has a live session", () => {
  const state = classroomArenaCtaState(true, "Aula · APIs REST");

  assert.equal(state.buttonLabel, "Continuar Arena");
  assert.equal(state.title, "Aula · APIs REST");
  assert.equal(state.live, true);
  assert.equal(state.disabled, false);
});

test("disables arena launch for an inactive classroom", () => {
  const state = classroomArenaCtaState(false);

  assert.equal(state.buttonLabel, "Arena indisponível");
  assert.equal(state.disabled, true);
});
