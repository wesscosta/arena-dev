import { apiFetch } from "./auth-api";

export type SessionEventType =
  | "SESSION_STARTED"
  | "SESSION_FINISHED"
  | "ARENA_SOURCE_SELECTED"
  | "ARENA_SOURCE_CLEARED"
  | "ARENA_QUESTION_PRESENTED"
  | "ARENA_QUESTIONS_RESTARTED"
  | "FLOW_STARTED"
  | "FLOW_STEP_CHANGED"
  | "DRAW_COMPLETED"
  | "GROUPS_ORGANIZED"
  | "BUZZER_OPENED"
  | "BUZZER_CLOSED"
  | "TIMER_STARTED"
  | "TIMER_PAUSED"
  | "TIMER_RESUMED"
  | "TIMER_EXTENDED"
  | "TIMER_FINISHED"
  | "TIMER_CANCELLED"
  | "WORD_CLOUD_OPENED"
  | "WORD_CLOUD_REVEALED"
  | "WORD_CLOUD_CLOSED"
  | "POLL_OPENED"
  | "POLL_REVEALED"
  | "POLL_CLOSED"
  | "BOSS_STARTED"
  | "BOSS_DEFEATED";

export type SessionEventActor = "TEACHER" | "SYSTEM";

export type SessionEvent = {
  id: string;
  sequenceNo: number;
  sessionId: string;
  classroomId: string;
  sessionTitle: string;
  eventType: SessionEventType;
  actor: SessionEventActor;
  summary: string;
  payload: Record<string, unknown>;
  occurredAt: string;
};

type ApiErrorBody = { message?: string };

async function request<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new Error(body?.message || `Falha ao carregar a linha do tempo (${response.status}).`);
  }
  return (await response.json()) as T;
}

export async function fetchSessionEvents(
  classroomId: string,
  limit = 200,
): Promise<SessionEvent[]> {
  return request<SessionEvent[]>(
    `/api/session-events?classroomId=${encodeURIComponent(classroomId)}&limit=${Math.max(1, Math.min(limit, 500))}`,
  );
}

export async function fetchSessionEventsBySession(
  sessionId: string,
): Promise<SessionEvent[]> {
  return request<SessionEvent[]>(`/api/sessions/${encodeURIComponent(sessionId)}/events`);
}
