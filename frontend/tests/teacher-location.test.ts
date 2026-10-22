import { readTeacherAppSource } from "./support/teacher-source";
import assert from "node:assert/strict";
import test from "node:test";
import { parseTeacherLocation, teacherLocationSearch } from "../lib/teacher-location";

test("teacher screens round-trip through readable query parameters", () => {
  const search = teacherLocationSearch({ view: "classroom", tab: "journeys", classroomId: "c1" });
  assert.equal(search, "?tela=turma&turma=c1&aba=jornadas");
  assert.deepEqual(parseTeacherLocation(search), { view: "classroom", tab: "journeys", classroomId: "c1" });
});

test("the classroom list is the bare page and drops classroom parameters", () => {
  assert.equal(teacherLocationSearch({ view: "dashboard", tab: "journeys", classroomId: "c1" }), "");
  assert.equal(teacherLocationSearch({ view: "library", tab: "home", classroomId: "c1" }), "?tela=biblioteca");
  assert.deepEqual(parseTeacherLocation(""), { view: "dashboard", tab: "home", classroomId: undefined });
});

test("unknown values fall back instead of breaking the page", () => {
  assert.deepEqual(parseTeacherLocation("?tela=xyz&aba=nada"), { view: "dashboard", tab: "home", classroomId: undefined });
  assert.deepEqual(parseTeacherLocation("?tela=biblioteca&turma=c1"), { view: "library", tab: "home", classroomId: undefined });
});

test("parameters owned by other features survive navigation", () => {
  assert.equal(
    teacherLocationSearch({ view: "settings", tab: "home" }, "?tela=turma&turma=c1&debug=1"),
    "?debug=1&tela=configuracoes",
  );
});

test("Journey creation is its own entry under the Journeys tab only", () => {
  const search = teacherLocationSearch({ view: "classroom", tab: "journeys", classroomId: "c1", journeyCreation: true });
  assert.equal(search, "?tela=turma&turma=c1&aba=jornadas&jornada=nova");
  assert.deepEqual(parseTeacherLocation(search), { view: "classroom", tab: "journeys", classroomId: "c1", journeyCreation: true });
  assert.equal(teacherLocationSearch({ view: "classroom", tab: "students", classroomId: "c1", journeyCreation: true }), "?tela=turma&turma=c1&aba=alunos");
  assert.deepEqual(parseTeacherLocation("?tela=turma&turma=c1&aba=alunos&jornada=nova"), { view: "classroom", tab: "students", classroomId: "c1" });
});

test("the teacher app pushes screen changes and restores them on popstate", () => {
  const app = readTeacherAppSource();
  assert.match(app, /window\.history\.pushState/);
  assert.match(app, /addEventListener\("popstate", restore\)/);
});
