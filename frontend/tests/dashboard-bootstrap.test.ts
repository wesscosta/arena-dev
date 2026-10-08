import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDashboardBootstrap } from "../lib/dashboard-bootstrap-api";

test("batch dashboard preserves optional-field normalization and session participation", () => {
  const snapshot = {
    classrooms: [{ id: "c1", name: "Turma A", code: null, active: true, themeColor: "emerald", themeIcon: "code", studentStudyAccessEnabled: false, createdAt: "2026-10-08T10:00:00Z" }],
    students: [{ id: "s1", name: "Pessoa Teste", registration: null, nickname: null, active: true, createdAt: "2026-10-08T10:00:00Z" }],
    enrollments: [{ id: "e1", classroomId: "c1", studentId: "s1", preferredName: null, active: true, joinedAt: "2026-10-08T10:00:00Z" }],
    sessions: [{ id: "live", classroomId: "c1", title: "Aula", status: "ACTIVE", startedAt: "2026-10-08T10:00:00Z", endedAt: null }],
    sessionParticipants: [{ id: "p1", sessionId: "live", studentId: "s1", name: "Pessoa Teste", registration: null, nickname: null, preferredName: null, displayName: "Pessoa", present: true, connected: false }],
    scoreEvents: [{ id: "score1", classroomId: "c1", studentId: "s1", sessionId: null, points: 5, category: "QUESTION", description: "Acerto", source: "MANUAL", activityId: null, questionId: null, createdAt: "2026-10-08T10:00:00Z", reversalOf: null, reversed: false }],
    activities: [{ id: "a1", classroomId: "c1", title: "Exercício", topic: null, points: 0, onTimeBonus: 0, resource: { kind: "INTERNAL", platform: null, url: null }, questions: [], createdAt: "2026-10-08T10:00:00Z", updatedAt: "2026-10-08T10:00:00Z", copiedFromActivityId: null, copiedFromClassroomId: null }],
  };
  // Raw DB projection may contain nullable values even where the ArenaData facade is stricter.
  const result = normalizeDashboardBootstrap(snapshot as never);
  assert.equal(result.classrooms[0]?.code, "");
  assert.equal(result.students[0]?.nickname, "");
  assert.equal(result.enrollments[0]?.preferredName, "");
  assert.equal(result.sessionParticipants[0]?.registration, "");
  assert.deepEqual(result.sessions[0]?.presentStudentIds, ["s1"]);
  assert.deepEqual(result.sessions[0]?.groups, []);
  assert.equal(result.scoreEvents[0]?.sessionId, undefined);
  assert.equal(result.activities[0]?.topic, undefined);
  assert.equal(result.activities[0]?.resource?.url, undefined);
});
