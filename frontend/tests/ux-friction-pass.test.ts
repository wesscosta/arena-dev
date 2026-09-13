import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const arena = readFileSync(resolve(process.cwd(), "components/ArenaApp.tsx"), "utf8");
const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

test("students page uses header actions instead of permanent entry forms", () => {
  assert.match(arena, /showPageHeader/);
  assert.match(arena, />Importar lista</);
  assert.match(arena, />\+ Adicionar aluno</);
  assert.match(arena, /entryMode === "add"/);
  assert.match(arena, /entryMode === "import"/);
  assert.doesNotMatch(arena, /student-manager-entry/);
});

test("public-name editor has readable save action and Enter shortcut", () => {
  assert.match(arena, /student-public-name-editor/);
  assert.match(arena, /student-save-name-button/);
  assert.match(arena, /event\.key === "Enter"/);
  assert.match(css, /font-size:14px/);
});

test("row actions are grouped", () => {
  assert.match(arena, /student-row-menu-trigger/);
  assert.match(arena, /Inativar aluno/);
  assert.match(arena, /Remover da turma/);
});

test("Arena CTA is wider and stronger on hover", () => {
  assert.match(css, /width:min\(76%,980px\)/);
  assert.match(css, /opacity:\.88/);
  assert.match(css, /arena-launch-button-centered:hover/);
});
