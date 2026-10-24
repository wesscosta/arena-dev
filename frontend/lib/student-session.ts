import { deviceClaimStorageKey } from "./app-state";

export function matchesStudentAccess(raw: string | null, studentId: string): boolean {
  if (!raw || !studentId) return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && "studentId" in parsed
      && (parsed as { studentId?: unknown }).studentId === studentId;
  } catch { return false; }
}

/** Clear only this enrolment's local secrets; do not remove other students' class sessions. */
export function clearStudentDeviceAccess(classroomId: string, studentId: string, token: string): void {
  if (typeof window === "undefined") return;
  const key = deviceClaimStorageKey(classroomId);
  if (window.localStorage.getItem(key) === token) window.localStorage.removeItem(key);
  for (let index = window.sessionStorage.length - 1; index >= 0; index--) {
    const sessionKey = window.sessionStorage.key(index);
    if (sessionKey?.startsWith("arena-dev-student:") && matchesStudentAccess(window.sessionStorage.getItem(sessionKey), studentId)) {
      window.sessionStorage.removeItem(sessionKey);
    }
  }
}
