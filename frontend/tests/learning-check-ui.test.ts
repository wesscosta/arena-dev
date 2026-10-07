import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const panel = readFileSync(
  resolve(process.cwd(), "components/LearningCheckPanel.tsx"),
  "utf8",
);
const join = readFileSync(
  resolve(process.cwd(), "components/StudentJoinFlow.tsx"),
  "utf8",
);
const arena = readFileSync(
  resolve(process.cwd(), "components/ArenaApp.tsx"),
  "utf8",
);
const chrome = readFileSync(
  resolve(process.cwd(), "components/arena/live/ArenaLiveChrome.tsx"),
  "utf8",
);

test("teacher learning check keeps the explicit evidence lifecycle", () => {
  assert.match(panel, /prepareLearningCheck/);
  assert.match(panel, /openLearningCheck/);
  assert.match(panel, /lockLearningCheck/);
  assert.match(panel, /revealLearningCheck/);
  assert.match(panel, /closeLearningCheck/);
  assert.doesNotMatch(panel, /evaluateLearningCheck/);
  assert.match(panel, /A checagem gera evidência; não XP/);
});

test("Arena exposes Learning Check as a distinct primary interaction", () => {
  assert.match(chrome, /"learning-check", "learning-check", "Verificar aprendizagem"/);
  assert.match(arena, /activeDynamic === "learning-check"/);
  assert.match(arena, /<LearningCheckPanel/);
});

test("participant renders Learning Check only from the authoritative live stage", () => {
  assert.match(join, /liveStage\.primary\.type === "LEARNING_CHECK"/);
  assert.match(join, /learningCheckParticipant\.runId === liveStage\.primary\.sourceId/);
  assert.match(join, /fetchParticipantLearningCheck\(access\.code, access\.token\)/);
});

test("participant correction stays protected until the server reveals it", () => {
  const block = join.match(
    /liveStage\.primary\.type === "LEARNING_CHECK"[\s\S]*?liveStage\.primary\.type === "WORD_CLOUD"/,
  )?.[0] ?? "";
  assert.ok(block.length > 0);
  assert.match(block, /resultsVisiblePublicly/);
  assert.match(block, /correctOptionKey/);
  assert.match(block, /A correção permanece protegida até o professor revelar o resultado/);
});

test("participant reconnect restores the private Learning Check state", () => {
  assert.match(join, /setLearningCheckParticipant\(runtime\.learningCheckParticipant/);
});


test("teacher result actions preserve the learning check boundary", () => {
  assert.match(panel, /repeatLearningCheck/);
  assert.match(panel, /Perguntar novamente/);
  assert.match(panel, /Formar grupos/);
  assert.match(arena, /onOpenGroups=\{\(\) => selectTool\("groups"\)\}/);
});
