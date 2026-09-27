import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projector = readFileSync(resolve(process.cwd(), "components/ProjectorView.tsx"), "utf8");

test("projector consumes quiz from initial and realtime runtime snapshots", () => {
  assert.match(projector, /setQuizState\(next\.runtime\.quiz/);
  assert.match(projector, /setQuizState\(runtime\.quiz\)/);
  assert.match(projector, /event\.type === "QUIZ_STATE"/);
});

test("projector gives QUIZ its own stage instead of falling back to waiting", () => {
  assert.match(projector, /const showQuiz = primaryType === "QUIZ"/);
  assert.match(projector, /showQuiz && quizRound\?\.question/);
});

test("projector keeps distribution protected until publicResultsVisible", () => {
  assert.match(projector, /quizRound\.publicResultsVisible \? \(/);
  assert.match(projector, /Resultados protegidos/);
  assert.match(projector, /quizRound\.totalAnswers/);
});

test("projector marks the correct option only inside the revealed result branch", () => {
  const quizBranch = projector.match(/showQuiz && quizRound\?\.question[\s\S]*?: showBoss \?/u)?.[0] ?? "";
  assert.ok(quizBranch.length > 0);
  assert.match(quizBranch, /quizOptionMatchesAnswer/);
  assert.match(quizBranch, /RESPOSTA CORRETA/);
});

test("projector mirrors the Arena lifecycle vocabulary for public dynamics", () => {
  assert.match(projector, /function quizLifecycleLabel/);
  assert.match(projector, /function pollLifecycleLabel/);
  assert.match(projector, /function wordCloudLifecycleLabel/);
  assert.match(projector, /function buzzerLifecycleLabel/);
  assert.match(projector, /function bossLifecycleLabel/);
  assert.match(projector, /"PREPARAR"/);
  assert.match(projector, /"AO VIVO"/);
  assert.match(projector, /"RESULTADO"/);
  assert.match(projector, /"ENCERRADO"/);
});

test("projector can retry the same session code after an initial snapshot failure", () => {
  assert.match(projector, /const \[loadAttempt, setLoadAttempt\] = useState\(0\)/);
  assert.match(projector, /setLoadAttempt\(\(attempt\) => attempt \+ 1\)/);
  assert.match(projector, /\}, \[code, loadAttempt\]\);/);
});
