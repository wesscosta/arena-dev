import assert from "node:assert/strict";
import test from "node:test";
import { parseStudentImportLine } from "../lib/student-import";

test("roster line accepts a name, an e-mail or both", () => {
  assert.deepEqual(parseStudentImportLine("Ana Luiza"), { name: "Ana Luiza", email: "" });
  assert.deepEqual(parseStudentImportLine(" joao.pedro@escola.edu.br "), { name: "", email: "joao.pedro@escola.edu.br" });
  assert.deepEqual(parseStudentImportLine("Carlos Henrique, carlos@escola.edu.br"), { name: "Carlos Henrique", email: "carlos@escola.edu.br" });
});

test("a comma without an e-mail stays part of the name", () => {
  assert.deepEqual(parseStudentImportLine("Silva, João"), { name: "Silva, João", email: "" });
});
