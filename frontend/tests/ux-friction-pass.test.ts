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

test("roster keeps one aligned row per student and hides destructive actions in a menu", () => {
  assert.match(arena, /<span>Aluno<\/span>\s*<span>Nome na turma<\/span>\s*<span>XP<\/span>\s*<span>Situação<\/span>/);
  assert.match(arena, /"sem e-mail"/);
  assert.match(arena, /Cadastro pendente/);
  assert.match(arena, /student-row-menu[\s\S]*Remover da turma[\s\S]*Apagar dados pessoais \(LGPD\)/);
  assert.match(arena, /planStudentImport\(/);
  assert.match(css, /\.student-table-v4 \.student-table-head-v3,\.student-table-v4 \.student-table-row-v3\{grid-template-columns:minmax\(220px,1\.3fr\) minmax\(170px,1fr\) 76px 150px 124px/);
});
