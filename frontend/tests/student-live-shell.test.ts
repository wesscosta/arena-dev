import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const live = readFileSync(resolve(process.cwd(), "app/learn/live/page.tsx"), "utf8");
const home = readFileSync(resolve(process.cwd(), "app/learn/page.tsx"), "utf8");
const join = readFileSync(resolve(process.cwd(), "components/StudentJoinFlow.tsx"), "utf8");
const studyApi = readFileSync(resolve(process.cwd(), "lib/study-api.ts"), "utf8");

test("student live shell discovers sessions but keeps the public join runtime shared", () => {
  assert.match(studyApi, /\/api\/learn\/live/);
  assert.match(live, /fetchAllStudyLiveSessions/);
  assert.match(live, /<StudentJoinFlow embedded/);
  assert.match(join, /initialCode/);
  assert.match(join, /!embedded && <div className="student-brand"/);
});

test("study home surfaces live context without turning journeys into live access", () => {
  assert.match(home, /fetchAllStudyLiveSessions/);
  assert.match(home, /Entrar ao vivo/);
  assert.match(home, /Seu espaço de estudo/);
});
