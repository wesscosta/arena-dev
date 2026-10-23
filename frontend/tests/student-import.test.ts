import assert from "node:assert/strict";
import test from "node:test";
import { parseStudentImportLine, planStudentImport } from "../lib/student-import";

test("roster line accepts a name, an e-mail or both", () => {
  assert.deepEqual(parseStudentImportLine("Ana Luiza"), { name: "Ana Luiza", email: "" });
  assert.deepEqual(parseStudentImportLine(" joao.pedro@escola.edu.br "), { name: "", email: "joao.pedro@escola.edu.br" });
  assert.deepEqual(parseStudentImportLine("Carlos Henrique, carlos@escola.edu.br"), { name: "Carlos Henrique", email: "carlos@escola.edu.br" });
});

test("a comma without an e-mail stays part of the name", () => {
  assert.deepEqual(parseStudentImportLine("Silva, João"), { name: "Silva, João", email: "" });
});

test("import plan creates, links, skips and flags each pasted line", () => {
  const students = [
    { id: "ana", name: "Ana Luiza", email: "ana@escola.edu.br" },
    { id: "bia", name: "Beatriz Lima", email: "bia@escola.edu.br" },
    { id: "caio", name: "Caio Carlos" },
  ];
  const plan = planStudentImport(
    [
      "Nome\tE-mail",
      "Ana Luiza\tANA@escola.edu.br",
      "Beatriz Lima\tbia@escola.edu.br",
      "caio  carlos",
      "Davi Souza, davi@escola",
      "Eva Melo\teva@escola.edu.br",
      "Eva M.\teva@escola.edu.br",
      "Fábio Reis",
    ].join("\n"),
    students,
    new Set(["ana", "caio"]),
  );
  assert.deepEqual(
    plan.map((row) => [row.name, row.email, row.status, row.studentId]),
    [
      ["Ana Luiza", "ana@escola.edu.br", "enrolled", "ana"],
      ["Beatriz Lima", "bia@escola.edu.br", "link", "bia"],
      ["caio  carlos", "", "enrolled", "caio"],
      ["Davi Souza", "davi@escola", "invalid-email", undefined],
      ["Eva Melo", "eva@escola.edu.br", "new", undefined],
      ["Eva M.", "eva@escola.edu.br", "duplicate", undefined],
      ["Fábio Reis", "", "new", undefined],
    ],
  );
});
