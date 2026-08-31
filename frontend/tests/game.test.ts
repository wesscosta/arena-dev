import assert from "node:assert/strict";
import test from "node:test";
import { createBalancedGroups, getLevel, getLevelProgress, xpForStudent } from "../lib/game";
import type { ScoreEvent } from "../lib/types";

function score(id: string, classroomId: string, studentId: string, points: number): ScoreEvent {
  return {
    id,
    classroomId,
    studentId,
    points,
    category: "QUESTION",
    description: id,
    createdAt: "2026-01-01T00:00:00Z",
  };
}

test("ranking soma somente eventos da turma e do aluno selecionados", () => {
  const events = [
    score("gain", "class-a", "student-a", 20),
    score("reversal", "class-a", "student-a", -5),
    score("other-student", "class-a", "student-b", 100),
    score("other-class", "class-b", "student-a", 100),
  ];
  assert.equal(xpForStudent(events, "class-a", "student-a"), 15);
});

test("nível e progresso respeitam os limites da Arena", () => {
  assert.equal(getLevel(99).name, "Aprendiz");
  assert.equal(getLevel(100).name, "Dev Júnior");
  assert.equal(getLevel(1000).name, "Arquiteto");
  assert.equal(getLevelProgress(-10), 0);
  assert.equal(getLevelProgress(1000), 100);
});

test("formação de grupos preserva todos os participantes sem duplicação", () => {
  const groups = createBalancedGroups(["a", "b", "c", "d", "e"], 2, []);
  assert.deepEqual(groups.flat().sort(), ["a", "b", "c", "d", "e"]);
  assert.equal(new Set(groups.flat()).size, 5);
  assert.ok(groups.every((group) => group.length >= 2 && group.length <= 3));
});
