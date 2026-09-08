import assert from "node:assert/strict";
import test from "node:test";
import {
  activeSessionId,
  deviceClaimStorageKey,
  normalizeJoinCode,
  selectPreferredClassroomId,
  restoreStudentAccess,
  studentAccessStorageKey,
} from "../lib/app-state";
import type { Classroom, GameSession } from "../lib/types";
import type { StudentJoinAccess } from "../lib/realtime-api";

const classrooms = [
  { id: "class-a", name: "A", code: "A", active: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "class-b", name: "B", code: "B", active: true, createdAt: "2026-01-01T00:00:00Z" },
] satisfies Classroom[];

function session(id: string, classroomId: string, status: GameSession["status"], endedAt?: string): GameSession {
  return {
    id,
    classroomId,
    title: id,
    status,
    startedAt: "2026-01-01T00:00:00Z",
    endedAt,
    presentStudentIds: [],
    drawCounts: {},
    answeredQuestionIds: [],
    groups: [],
    groupSize: 2,
  };
}

test("preserva a turma selecionada quando ela ainda existe", () => {
  assert.equal(selectPreferredClassroomId(classrooms, "class-b"), "class-b");
});

test("recua para a primeira turma quando a preferência ficou obsoleta", () => {
  assert.equal(selectPreferredClassroomId(classrooms, "removed"), "class-a");
  assert.equal(selectPreferredClassroomId([], "removed"), undefined);
});

test("seleciona somente a sessão ativa e não encerrada da turma", () => {
  const sessions = [
    session("finished", "class-a", "FINISHED", "2026-01-01T01:00:00Z"),
    session("active-b", "class-b", "ACTIVE"),
    session("active-a", "class-a", "ACTIVE"),
  ];
  assert.equal(activeSessionId(sessions, "class-a"), "active-a");
  assert.equal(activeSessionId(sessions, "missing"), undefined);
});

test("normaliza código e separa armazenamento de sessão e dispositivo", () => {
  assert.equal(normalizeJoinCode(" ab12cd "), "AB12CD");
  assert.equal(studentAccessStorageKey(" ab12cd "), "arena-dev-student:AB12CD");
  assert.equal(deviceClaimStorageKey("class-a"), "arena-dev-device:class-a");
});

test("restaura somente token válido da mesma sessão", () => {
  const access = {
    token: "token",
    code: "AB12CD",
    sessionId: "session-a",
    classroomName: "Turma",
    sessionTitle: "Aula",
    participantId: "participant-a",
    studentId: "student-a",
    name: "Ana",
    displayName: "Ana",
    present: true,
    expiresAt: "2026-09-01T00:00:00Z",
  } satisfies StudentJoinAccess;
  const raw = JSON.stringify(access);

  assert.deepEqual(restoreStudentAccess(raw, "session-a", Date.parse("2026-08-31T00:00:00Z")), access);
  assert.equal(restoreStudentAccess(raw, "session-b", Date.parse("2026-08-31T00:00:00Z")), null);
  assert.equal(restoreStudentAccess(raw, "session-a", Date.parse("2026-09-01T00:00:00Z")), null);
  assert.equal(restoreStudentAccess("{invalid", "session-a"), null);
});
