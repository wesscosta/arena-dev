import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const arena = readFileSync(resolve(process.cwd(), "components/ArenaApp.tsx"), "utf8");
const api = readFileSync(resolve(process.cwd(), "lib/classroom-api.ts"), "utf8");
const switcher = readFileSync(resolve(process.cwd(), "components/ClassroomContextSwitcher.module.css"), "utf8");

test("classroom management is a page with explicit lifecycle actions", () => {
  assert.match(arena, /function ClassroomManagementPage/);
  assert.match(arena, /CICLO DE VIDA/);
  assert.match(arena, /ZONA DE RISCO/);
  assert.doesNotMatch(arena, /function ClassroomEditModal/);
});

test("hard delete still requires exact classroom name", () => {
  assert.match(arena, /deleteConfirmation === classroom\.name/);
  assert.match(api, /confirmationName/);
  assert.match(api, /method:\s*"DELETE"/);
});

test("classroom management does not duplicate the students workspace", () => {
  const start = arena.indexOf("function ClassroomManagementPage");
  const end = arena.indexOf("function ArenaView", start);
  const block = arena.slice(start, end);
  assert.doesNotMatch(block, /StudentManager/);
  assert.doesNotMatch(block, /modal-tabs/);
});

test("classroom switcher keeps themed scrolling", () => {
  assert.match(switcher, /\.list::-webkit-scrollbar/);
  assert.match(switcher, /scrollbar-width:\s*thin/);
});
