import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const joinPage = readFileSync(resolve(process.cwd(), "app/join/page.tsx"), "utf8");

test("join renders the authoritative quiz only while the shared stage is QUIZ", () => {
  assert.match(joinPage, /liveStage\.primary\.type === "QUIZ"/);
  assert.match(joinPage, /const activeQuizRound = quiz\.round/);
  assert.match(joinPage, /const activeQuizQuestion = activeQuizRound\?\.question/);
});

test("join sends structured answers with the temporary participant token", () => {
  assert.match(joinPage, /sendQuizAnswer\(access\.code, quiz\.round\.id, access\.token, answer\)/);
});

test("join never renders the quiz correctAnswer directly in the answer card", () => {
  const quizBlock = joinPage.match(/liveStage\.primary\.type === "QUIZ"[\s\S]*?liveStage\.primary\.type === "WORD_CLOUD"/)?.[0] ?? "";
  assert.ok(quizBlock.length > 0);
  assert.doesNotMatch(quizBlock, /correctAnswer/);
});
