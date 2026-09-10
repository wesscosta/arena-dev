import { apiFetch } from "./auth-api";

export type TimerStatus = "READY" | "RUNNING" | "PAUSED" | "FINISHED" | "CANCELLED";

export type SessionTimer = {
  id: string;
  sessionId: string;
  title: string;
  instructions?: string | null;
  status: TimerStatus;
  durationSeconds: number;
  remainingSeconds: number;
  startedAt?: string | null;
  endsAt?: string | null;
  pausedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TimerState = {
  timer: SessionTimer | null;
  serverOccurredAt?: string;
  receivedAtMs?: number;
};

export type CreateTimerInput = {
  title?: string;
  instructions?: string;
  durationSeconds: number;
};

type ApiErrorBody = { message?: string };

export class TimerApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "TimerApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new TimerApiError(
      body?.message || `Falha na API do Timer (${response.status}).`,
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function timerPath(sessionId: string, timerId?: string) {
  const base = `/api/sessions/${sessionId}/timers`;
  return timerId ? `${base}/${timerId}` : base;
}

export async function fetchTimerState(sessionId: string): Promise<TimerState> {
  const timers = await request<SessionTimer[]>(timerPath(sessionId));
  return { timer: timers[0] ?? null };
}

export function createTimer(sessionId: string, input: CreateTimerInput) {
  return request<SessionTimer>(timerPath(sessionId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function startTimer(sessionId: string, timerId: string) {
  return request<SessionTimer>(`${timerPath(sessionId, timerId)}/start`, { method: "POST" });
}

export function pauseTimer(sessionId: string, timerId: string) {
  return request<SessionTimer>(`${timerPath(sessionId, timerId)}/pause`, { method: "POST" });
}

export function resumeTimer(sessionId: string, timerId: string) {
  return request<SessionTimer>(`${timerPath(sessionId, timerId)}/resume`, { method: "POST" });
}

export function extendTimer(sessionId: string, timerId: string, seconds: number) {
  return request<SessionTimer>(`${timerPath(sessionId, timerId)}/extend`, {
    method: "POST",
    body: JSON.stringify({ seconds }),
  });
}

export function finishTimer(sessionId: string, timerId: string) {
  return request<SessionTimer>(`${timerPath(sessionId, timerId)}/finish`, { method: "POST" });
}

export function cancelTimer(sessionId: string, timerId: string) {
  return request<SessionTimer>(`${timerPath(sessionId, timerId)}/cancel`, { method: "POST" });
}
