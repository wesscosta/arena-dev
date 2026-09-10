import type { Classroom, GameSession } from "./types";
import type { StudentJoinAccess } from "./realtime-api";

export function selectPreferredClassroomId(classrooms: Classroom[], storedId?: string) {
  return classrooms.some((classroom) => classroom.id === storedId)
    ? storedId
    : classrooms[0]?.id;
}

export function activeSessionId(sessions: GameSession[], classroomId?: string) {
  return sessions.find((session) => (
    session.classroomId === classroomId
    && session.status === "ACTIVE"
    && !session.endedAt
  ))?.id;
}

export function normalizeJoinCode(code: string) {
  return code.trim().toUpperCase();
}

export function studentAccessStorageKey(code: string) {
  return `arena-dev-student:${normalizeJoinCode(code)}`;
}

export function deviceClaimStorageKey(classroomId: string) {
  return `arena-dev-device:${classroomId}`;
}

export function restoreStudentAccess(
  raw: string | null,
  sessionId: string,
  now = Date.now(),
): StudentJoinAccess | null {
  if (!raw) return null;
  try {
    const access = JSON.parse(raw) as StudentJoinAccess;
    const expiresAt = new Date(access.expiresAt).getTime();
    if (access.sessionId !== sessionId || !Number.isFinite(expiresAt) || expiresAt <= now) {
      return null;
    }
    return access;
  } catch {
    return null;
  }
}
