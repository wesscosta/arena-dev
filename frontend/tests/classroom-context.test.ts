import assert from "node:assert/strict";
import test from "node:test";
import {
  classroomContextStatus,
  filterClassroomsForContext,
} from "../lib/classroom-context";
import type { Classroom } from "../lib/types";

const classrooms: Classroom[] = [
  {
    id: "1",
    name: "Recursos Tecnológicos",
    code: "2026.08.308",
    active: true,
    createdAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Técnico em Desenvolvimento de Sistemas",
    code: "UC05-TDS",
    active: false,
    createdAt: "2026-09-02T00:00:00Z",
  },
];

test("filters by name ignoring accents", () => {
  assert.deepEqual(
    filterClassroomsForContext(classrooms, "tecnologicos").map((item) => item.id),
    ["1"],
  );
});

test("filters by code", () => {
  assert.deepEqual(
    filterClassroomsForContext(classrooms, "uc05").map((item) => item.id),
    ["2"],
  );
});

test("exposes only meaningful classroom statuses", () => {
  assert.equal(classroomContextStatus(classrooms[0], false), undefined);
  assert.equal(classroomContextStatus(classrooms[0], true), "LIVE");
  assert.equal(classroomContextStatus(classrooms[1], false), "INACTIVE");
});
