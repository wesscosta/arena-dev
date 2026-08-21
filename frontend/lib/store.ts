import type { ArenaData } from "./types";

export const STORAGE_KEY = "arena-dev-v1";

export const EMPTY_DATA: ArenaData = {
  classrooms: [],
  students: [],
  enrollments: [],
  sessions: [],
  sessionParticipants: [],
  sessionRuntime: [],
  scoreEvents: [],
  activities: [],
  groupHistory: [],
};

export function loadData(): ArenaData {
  if (typeof window === "undefined") return EMPTY_DATA;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_DATA;
  try {
    const parsed = JSON.parse(raw) as Partial<ArenaData>;
    return {
      ...EMPTY_DATA,
      activeClassroomId: parsed.activeClassroomId,
    };
  } catch {
    return EMPTY_DATA;
  }
}

export function saveData(data: ArenaData) {
  if (typeof window === "undefined") return;
  // Incremento 7: todo o núcleo operacional já é autoritativo no backend.
  // O navegador guarda apenas preferência de contexto; não guarda domínio.
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    activeClassroomId: data.activeClassroomId,
  }));
}

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}
