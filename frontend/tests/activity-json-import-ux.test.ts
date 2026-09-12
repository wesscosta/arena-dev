import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const builder = readFileSync(resolve(process.cwd(), "components/ActivityQuestionBuilder.tsx"), "utf8");
const arena = readFileSync(resolve(process.cwd(), "components/ArenaApp.tsx"), "utf8");

test("successful JSON import is explicitly a draft import", () => {
  assert.match(builder, /adicionada\(s\) ao rascunho da atividade/);
  assert.match(builder, /Agora use <b>Salvar atividade<\/b> para persistir/);
  assert.match(builder, /setLastImportedCount\(importedCount\)/);
});

test("save activity is no longer a silent dead button when title is missing", () => {
  assert.match(arena, /disabled=\{activityBusy\}/);
  assert.match(arena, /setEditorTab\("general"\)/);
  assert.match(arena, /Informe o título da atividade para salvar/);
  assert.match(arena, /Definir título e salvar/);
});

test("JSON import still appends parsed questions to the draft", () => {
  assert.match(builder, /setQuestions\(\[\.\.\.questions, \.\.\.result\.package\.questions\]\)/);
});
