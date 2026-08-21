import type { ArenaData, SessionRuntimeState } from "./types";

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

function runtimeFromSessions(data: ArenaData): SessionRuntimeState[] {
  return data.sessions
    .filter((session) => session.status !== "FINISHED" && !session.endedAt)
    .map((session) => ({
      sessionId: session.id,
      drawCounts: session.drawCounts ?? {},
      lastDrawnStudentId: session.lastDrawnStudentId,
      boss: session.boss,
      activityId: session.activityId,
      currentQuestionId: session.currentQuestionId,
      answeredQuestionIds: session.answeredQuestionIds ?? [],
    }));
}

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

    // Incremento 4 estabeleceu uma fronteira limpa para Classroom/Student/Enrollment.
    // Incremento 5 amplia essa fronteira para ClassSession/SessionParticipant e o
    // Incremento 6 para ScoreEvent. Dados duráveis desses domínios são reconstruídos pela API.
    if (hasLegacyLocalClassroomDomain) return EMPTY_DATA;

    return {
      ...EMPTY_DATA,
      ...parsed,
      classrooms: [],
      students: [],
      enrollments: [],
      sessions: [],
      sessionParticipants: [],
      sessionRuntime: parsed.sessionRuntime ?? [],
      scoreEvents: [],
      activities: parsed.activities ?? [],
      groupHistory: parsed.groupHistory ?? [],
      currentSessionId: undefined,
    };
  } catch {
    return EMPTY_DATA;
  }
}

export function saveData(data: ArenaData) {
  if (typeof window === "undefined") return;
  const localOnly: ArenaData = {
    ...data,
    // Backend/PostgreSQL são fonte de verdade para esses domínios.
    classrooms: [],
    students: [],
    enrollments: [],
    sessions: [],
    sessionParticipants: [],
    scoreEvents: [],
    currentSessionId: undefined,
    // Mecânicas ainda não migradas (sorteio, Boss e fonte da Arena) permanecem
    // temporariamente locais, mas sempre referenciam o UUID de uma sessão real.
    sessionRuntime: runtimeFromSessions(data),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localOnly));
}

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}
