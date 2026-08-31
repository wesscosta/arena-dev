import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { fetchTeacherSession, loginTeacher } from "../lib/auth-api";
import { fetchClassroomDomain } from "../lib/classroom-api";
import { fetchPublicSession, joinSession } from "../lib/realtime-api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("sessão expirada do professor resulta em estado não autenticado", async () => {
  globalThis.fetch = async () => jsonResponse({ message: "Não autenticado" }, 401);
  assert.equal(await fetchTeacherSession(), null);
});

test("login envia credenciais e preserva cookie de sessão", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://localhost:8080/api/auth/login");
    assert.equal(init?.method, "POST");
    assert.equal(init?.credentials, "include");
    assert.deepEqual(JSON.parse(String(init?.body)), { username: "professor", password: "segredo" });
    return jsonResponse({ username: "professor", role: "TEACHER" });
  };

  assert.deepEqual(await loginTeacher("professor", "segredo"), { username: "professor", role: "TEACHER" });
});

test("carregamento da turma combina turmas, alunos e matrículas", async () => {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/api/classrooms?includeInactive=true")) {
      return jsonResponse([{ id: "class-a", name: "Turma A", code: null, active: true, createdAt: "2026-01-01T00:00:00Z" }]);
    }
    if (url.endsWith("/api/students?includeInactive=true")) {
      return jsonResponse([{ id: "student-a", registration: null, name: "Ana", nickname: null, active: true, createdAt: "2026-01-01T00:00:00Z" }]);
    }
    if (url.endsWith("/api/classrooms/class-a/students?includeInactive=true")) {
      return jsonResponse([{ enrollmentId: "enrollment-a", studentId: "student-a", registration: null, name: "Ana", nickname: null, studentActive: true, enrollmentActive: true, joinedAt: "2026-01-01T00:00:00Z" }]);
    }
    return jsonResponse({ message: `Rota inesperada: ${url}` }, 404);
  };

  const domain = await fetchClassroomDomain();
  assert.equal(domain.classrooms[0]?.code, "");
  assert.equal(domain.students[0]?.nickname, "");
  assert.deepEqual(domain.enrollments[0], {
    id: "enrollment-a",
    classroomId: "class-a",
    studentId: "student-a",
    active: true,
    joinedAt: "2026-01-01T00:00:00Z",
  });
});

test("join normaliza o código e envia a identidade do participante", async () => {
  const access = {
    token: "token",
    code: "AB12CD",
    sessionId: "session-a",
    classroomName: "Turma A",
    sessionTitle: "Aula",
    participantId: "participant-a",
    studentId: "student-a",
    name: "Ana",
    present: true,
    expiresAt: "2026-09-01T00:00:00Z",
  };
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    calls += 1;
    const url = String(input);
    assert.equal(url, "http://localhost:8080/api/join/AB12CD");
    if (calls === 1) {
      assert.equal(init?.method, undefined);
      return jsonResponse({ sessionId: "session-a", classroomName: "Turma A", sessionTitle: "Aula", code: "AB12CD", expiresAt: access.expiresAt });
    }
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), { identity: "2026001" });
    return jsonResponse(access);
  };

  assert.equal((await fetchPublicSession(" ab12cd ")).sessionId, "session-a");
  assert.deepEqual(await joinSession(" ab12cd ", "2026001"), access);
});
