import { componentBlock, readTeacherAppSource } from "./support/teacher-source";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const arena = readTeacherAppSource();
const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

test("classroom management is a dedicated application view", () => {
  assert.match(arena, /"classroom-settings"/);
  assert.match(arena, /function ClassroomManagementPage/);
  assert.match(arena, /GERENCIAR TURMA/);
  assert.doesNotMatch(arena, /function ClassroomEditModal/);
});

test("classroom management no longer duplicates students", () => {
  const block = componentBlock(arena, "ClassroomManagementPage");
  assert.match(block, /GERENCIAR TURMA/);
  assert.doesNotMatch(block, /StudentManager/);
  assert.doesNotMatch(block, /modal-tabs/);
});

test("management page has responsive two-column layout", () => {
  assert.match(css, /\.classroom-settings-grid/);
  assert.match(arena, /ZONA DE RISCO/);
});
