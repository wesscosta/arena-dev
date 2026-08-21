import { fetchSessionMechanics } from "./mechanics-api";
import type { Classroom, GameSession, SessionParticipant, SessionRuntimeState } from "./types";
import { apiFetch } from "./auth-api";


type ApiErrorBody = {
  message?: string;
  fields?: Record<string, string>;
};

export class SessionApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "SessionApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new SessionApiError(body?.message || `Falha na API de sessão (${response.status}).`, response.status, body?.fields);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

type SessionView = {
  id: string;
  classroomId: string;
  classroomName: string;
  title: string;
  status: "ACTIVE" | "FINISHED";
  startedAt: string;
  endedAt: string | null;
};

type ParticipantView = {
  id: string;
  studentId: string;
  registration: string | null;
  name: string;
  nickname: string | null;
  present: boolean;
  connected: boolean;
};

function mapParticipant(sessionId: string, item: ParticipantView): SessionParticipant {
  return {
    id: item.id,
    sessionId,
    studentId: item.studentId,
    registration: item.registration ?? "",
    name: item.name,
    nickname: item.nickname ?? "",
    present: item.present,
    connected: item.connected,
  };
}

function mapSession(item: SessionView, participants: SessionParticipant[], runtime?: SessionRuntimeState): GameSession {
  return {
    id: item.id,
    classroomId: item.classroomId,
    title: item.title,
    status: item.status,
    startedAt: item.startedAt,
    endedAt: item.endedAt ?? undefined,
    presentStudentIds: participants.filter((participant) => participant.present).map((participant) => participant.studentId),
    drawCounts: runtime?.drawCounts ?? {},
    lastDrawnStudentId: runtime?.lastDrawnStudentId,
    boss: runtime?.boss,
    activityId: runtime?.activityId,
    currentQuestionId: runtime?.currentQuestionId,
    answeredQuestionIds: runtime?.answeredQuestionIds ?? [],
    groups: runtime?.groups ?? [],
    groupSize: runtime?.groupSize ?? 2,
  };
}

export async function fetchSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
  const rows = await request<ParticipantView[]>(`/api/sessions/${sessionId}/participants`);
  return rows.map((row) => mapParticipant(sessionId, row));
}

export async function fetchSessionDomain(
  classrooms: Classroom[],
): Promise<{ sessions: GameSession[]; sessionParticipants: SessionParticipant[] }> {
  const sessionGroups = await Promise.all(
    classrooms.map((classroom) => request<SessionView[]>(`/api/sessions?classroomId=${encodeURIComponent(classroom.id)}`)),
  );
  const sessionViews = sessionGroups.flat();
  const activeSessionViews = sessionViews.filter((session) => session.status === "ACTIVE" && !session.endedAt);
  const [participantGroups, mechanics] = await Promise.all([
    Promise.all(activeSessionViews.map((session) => fetchSessionParticipants(session.id))),
    Promise.all(activeSessionViews.map((session) => fetchSessionMechanics(session.id))),
  ]);
  const sessionParticipants = participantGroups.flat();
  const mechanicsBySession = new Map(mechanics.map((item) => [item.sessionId, item]));
  const participantsBySession = new Map<string, SessionParticipant[]>();
  for (const participant of sessionParticipants) {
    const rows = participantsBySession.get(participant.sessionId) ?? [];
    rows.push(participant);
    participantsBySession.set(participant.sessionId, rows);
  }

  return {
    sessions: sessionViews.map((session) => mapSession(
      session,
      participantsBySession.get(session.id) ?? [],
      mechanicsBySession.get(session.id),
    )),
    sessionParticipants,
  };
}


export async function releaseParticipantDevice(sessionId: string, participantId: string): Promise<SessionParticipant> {
  const row = await request<ParticipantView>(`/api/sessions/${sessionId}/participants/${participantId}/release-device`, { method: "POST" });
  return mapParticipant(sessionId, row);
}

export async function createSession(input: {
  classroomId: string;
  title: string;
  presentStudentIds: string[];
}): Promise<{ session: GameSession; participants: SessionParticipant[] }> {
  const created = await request<SessionView>("/api/sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const participants = await fetchSessionParticipants(created.id);
  return {
    session: mapSession(created, participants),
    participants,
  };
}

export async function finishSession(sessionId: string): Promise<GameSession> {
  const result = await request<SessionView>(`/api/sessions/${sessionId}/finish`, {
    method: "POST",
  });
  return mapSession(result, []);
}

export async function setParticipantPresence(
  sessionId: string,
  participantId: string,
  present: boolean,
): Promise<SessionParticipant> {
  const result = await request<ParticipantView>(`/api/sessions/${sessionId}/participants/${participantId}/presence`, {
    method: "PATCH",
    body: JSON.stringify({ present }),
  });
  return mapParticipant(sessionId, result);
}
