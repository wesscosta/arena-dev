import type { GameSession, SessionParticipant, SessionRuntimeState } from "./types";
import { apiRequest } from "./http/client";
import { HttpApiError } from "./http/errors";


export class SessionApiError extends HttpApiError {
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message, status, fields);
    this.name = "SessionApiError";
  }
}

function sessionRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init, {
    errorMessage: (status) => `Falha na API de sessão (${status}).`,
    errorFactory: (message, status, fields) => new SessionApiError(message, status, fields),
  });
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
  preferredName: string | null;
  displayName: string;
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
    preferredName: item.preferredName ?? "",
    displayName: item.displayName,
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
    selectorPresentation: runtime?.selectorPresentation ?? "GRID_SPOTLIGHT",
    boss: runtime?.boss,
    activityId: runtime?.activityId,
    currentQuestionId: runtime?.currentQuestionId,
    answeredQuestionIds: runtime?.answeredQuestionIds ?? [],
    groups: runtime?.groups ?? [],
    groupSize: runtime?.groupSize ?? 2,
  };
}

export async function fetchSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
  const rows = await sessionRequest<ParticipantView[]>(`/api/sessions/${sessionId}/participants`);
  return rows.map((row) => mapParticipant(sessionId, row));
}

export async function releaseParticipantDevice(sessionId: string, participantId: string): Promise<SessionParticipant> {
  const row = await sessionRequest<ParticipantView>(`/api/sessions/${sessionId}/participants/${participantId}/release-device`, { method: "POST" });
  return mapParticipant(sessionId, row);
}

export async function createSession(input: {
  classroomId: string;
  title: string;
  presentStudentIds: string[];
}): Promise<{ session: GameSession; participants: SessionParticipant[] }> {
  const created = await sessionRequest<SessionView>("/api/sessions", {
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
  const result = await sessionRequest<SessionView>(`/api/sessions/${sessionId}/finish`, {
    method: "POST",
  });
  return mapSession(result, []);
}

export async function setParticipantPresence(
  sessionId: string,
  participantId: string,
  present: boolean,
): Promise<SessionParticipant> {
  const result = await sessionRequest<ParticipantView>(`/api/sessions/${sessionId}/participants/${participantId}/presence`, {
    method: "PATCH",
    body: JSON.stringify({ present }),
  });
  return mapParticipant(sessionId, result);
}
