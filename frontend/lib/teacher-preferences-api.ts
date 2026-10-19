import { apiFetch } from "./auth-api";

export type TeacherPreferences = {
  sessionTimeoutMinutes: number;
  defaultSessionTimeoutMinutes: number;
};

/** Durations offered to the teacher; the backend accepts 30 minutes to 12 hours. */
export const SESSION_TIMEOUT_OPTIONS = [30, 60, 120, 240, 480, 720] as const;

export function formatSessionTimeout(minutes: number) {
  if (minutes < 60) return `${minutes} minutos`;
  const hours = minutes / 60;
  return hours === 1 ? "1 hora" : `${hours} horas`;
}

async function read(response: Response): Promise<TeacherPreferences> {
  if (!response.ok) {
    let message = `Não foi possível carregar as preferências (${response.status}).`;
    try { message = ((await response.json()) as { message?: string }).message || message; } catch { /* keep default */ }
    throw new Error(message);
  }
  return (await response.json()) as TeacherPreferences;
}

export async function fetchTeacherPreferences() {
  return read(await apiFetch("/api/teacher/preferences"));
}

export async function saveSessionTimeout(sessionTimeoutMinutes: number) {
  return read(await apiFetch("/api/teacher/preferences", {
    method: "PUT",
    body: JSON.stringify({ sessionTimeoutMinutes }),
  }));
}
