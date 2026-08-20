import type { ArenaData } from "./types";

export const STORAGE_KEY = "arena-dev-v1";

export const EMPTY_DATA: ArenaData = {
  classrooms: [],
  students: [],
  enrollments: [],
  sessions: [],
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
      ...parsed,
      classrooms: parsed.classrooms ?? [],
      students: parsed.students ?? [],
      enrollments: parsed.enrollments ?? [],
      sessions: parsed.sessions ?? [],
      scoreEvents: parsed.scoreEvents ?? [],
      activities: parsed.activities ?? [],
      groupHistory: parsed.groupHistory ?? [],
    };
  } catch {
    return EMPTY_DATA;
  }
}

export function saveData(data: ArenaData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}
