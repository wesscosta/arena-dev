import { readTeacherAppSource } from "./support/teacher-source";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const arena = readTeacherAppSource();
const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

test("students page uses header actions instead of permanent entry forms", () => {
  assert.match(arena, /showPageHeader/);
  assert.match(arena, /Importar/);
  assert.match(arena, /Adicionar aluno/);
  assert.match(arena, /entryMode === "add"/);
  assert.match(arena, /entryMode === "import"/);
  assert.doesNotMatch(arena, /student-manager-entry/);
});

test("public-name editor has readable save action and Enter shortcut", () => {
  assert.match(arena, /student-display-name-editor/);
  assert.match(arena, /student-display-name/);
  assert.match(arena, /event\.key === "Enter"/);
  assert.match(css, /font-size:14px/);
});

test("row actions are grouped", () => {
  assert.match(arena, /student-row-actions/);
  assert.match(arena, /Desativar participante/);
  assert.match(arena, /Remover da turma/);
});
