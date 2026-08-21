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
    const hasLegacyLocalClassroomDomain =
      (parsed.classrooms?.length ?? 0) > 0 ||
      (parsed.students?.length ?? 0) > 0 ||
      (parsed.enrollments?.length ?? 0) > 0;

    // Incremento 4 estabelece uma fronteira limpa de persistência. Como os IDs
    // de Classroom/Student/Enrollment agora são UUIDs emitidos pelo backend, não
    // tentamos remapear dados experimentais dos incrementos local-first anteriores.
    // Se esse legado for detectado, iniciamos os módulos locais vazios.
    if (hasLegacyLocalClassroomDomain) return EMPTY_DATA;

    return {
      ...EMPTY_DATA,
      ...parsed,
      classrooms: [],
      students: [],
      enrollments: [],
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
  const localOnly: ArenaData = {
    ...data,
    // O backend é a fonte de verdade desses três domínios. Não persistimos cópias
    // autoritativas no navegador para evitar divergência entre REST e localStorage.
    classrooms: [],
    students: [],
    enrollments: [],
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localOnly));
}

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}
