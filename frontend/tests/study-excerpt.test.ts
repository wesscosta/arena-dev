import test from "node:test";
import assert from "node:assert/strict";
import { isExcerptOfBody, studyExcerpt } from "../lib/study-excerpt";

test("study excerpt removes fenced code instead of flattening it into the preview", () => {
  const value = "Dentro do diretório da UC, criar:\n\n```text\ndesenvolver_algoritmos/\n├── modulo_01/\n└── projetos/\n```\n\nUse nomes simples.";
  assert.equal(studyExcerpt(value), "Dentro do diretório da UC, criar: Use nomes simples.");
});

test("study excerpt removes common markdown decoration and truncates cleanly", () => {
  const value = "### Objetivo\n- **Criar variáveis** com nomes adequados.\n- [Consultar referência](https://example.com)";
  const excerpt = studyExcerpt(value, 55);
  assert.equal(excerpt.length, 55);
  assert.match(excerpt, /^Objetivo Criar variáveis com nomes adequados\./);
  assert.doesNotMatch(excerpt, /[#*\[\]()]/);
});

test("study excerpt drops Markdown table rows instead of showing raw pipes", () => {
  const body = "| Capítulo | Tema |\n| --- | --- |\n| 01 | Introdução |\n\nTexto depois da tabela.";
  assert.equal(studyExcerpt(body), "Texto depois da tabela.");
});

test("a description that only repeats the opening of the body is recognised", () => {
  const body = "| Capítulo | Tema | Descrição |\n| --- | --- | --- |\n| 01 | Introdução a Banco de Dados | Dados e informação |";
  const importedDescription = "| Capítulo | Tema | Descrição | | --- | --- | --- | | 01 | Introdução a Banco de Dados | Dados e…";
  assert.equal(isExcerptOfBody(importedDescription, body), true);
  const mer = "- **MER — Modelo Entidade-Relacionamento:** representa entidades, atributos e regras.\n- **DER**";
  assert.equal(isExcerptOfBody("MER — Modelo Entidade-Relacionamento: representa entidades, atributos e regras. DER…", mer), true);
});

test("a description written by the teacher is kept above the body", () => {
  assert.equal(isExcerptOfBody("Objetivo: diferenciar modelo conceitual e lógico.", "# MER\n\nO modelo entidade-relacionamento..."), false);
  assert.equal(isExcerptOfBody("Curto", "Curto e mais texto"), false);
});
