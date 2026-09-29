import test from "node:test";
import assert from "node:assert/strict";
import { studyExcerpt } from "../lib/study-excerpt";

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
