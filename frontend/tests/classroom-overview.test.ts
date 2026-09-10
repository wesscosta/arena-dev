import assert from "node:assert/strict";
import test from "node:test";
import { orderOverviewClassrooms } from "../lib/classroom-overview";

const classrooms = [
  { id: "a", name: "Desenvolvimento de Sistemas", code: "TDS-03", active: true },
  { id: "b", name: "Redes de Computadores", code: "RED-02", active: true },
  { id: "c", name: "Banco de Dados", code: "BD-01", active: true },
  { id: "d", name: "Algoritmos", code: "", active: false },
];

test("recent mode prioritizes selected live classroom, other live sessions and MRU", () => {
  const ordered = orderOverviewClassrooms(classrooms, {
    query: "",
    sortMode: "RECENT",
    selectedClassroomId: "b",
    activeSessionClassroomIds: ["a", "b"],
    recentClassroomIds: ["c", "b", "d"],
  });

  assert.deepEqual(ordered.map((item) => item.id), ["b", "a", "c", "d"]);
});

test("search matches classroom name and code ignoring accents and case", () => {
  const byName = orderOverviewClassrooms(classrooms, {
    query: "banco",
    sortMode: "RECENT",
    activeSessionClassroomIds: [],
    recentClassroomIds: [],
  });
  const byCode = orderOverviewClassrooms(classrooms, {
    query: "red-02",
    sortMode: "RECENT",
    activeSessionClassroomIds: [],
    recentClassroomIds: [],
  });

  assert.deepEqual(byName.map((item) => item.id), ["c"]);
  assert.deepEqual(byCode.map((item) => item.id), ["b"]);
});

test("explicit name sorting overrides recent ordering", () => {
  const ordered = orderOverviewClassrooms(classrooms, {
    query: "",
    sortMode: "NAME_ASC",
    selectedClassroomId: "b",
    activeSessionClassroomIds: ["b"],
    recentClassroomIds: ["c", "b"],
  });

  assert.deepEqual(
    ordered.map((item) => item.name),
    ["Algoritmos", "Banco de Dados", "Desenvolvimento de Sistemas", "Redes de Computadores"],
  );
});

test("code sorting keeps classrooms without code at the end", () => {
  const ordered = orderOverviewClassrooms(classrooms, {
    query: "",
    sortMode: "CODE_ASC",
    activeSessionClassroomIds: [],
    recentClassroomIds: [],
  });

  assert.deepEqual(ordered.map((item) => item.id), ["c", "b", "a", "d"]);
});
