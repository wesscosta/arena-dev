import { apiRequest } from "./http/client";
import { HttpApiError } from "./http/errors";

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


export class TimerApiError extends HttpApiError {
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message, status, fields);
    this.name = "TimerApiError";
  }
}

function timerRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init, {
    errorMessage: (status) => `Falha na API do Timer (${status}).`,
    errorFactory: (message, status) => new TimerApiError(message, status),
  });
}

function timerPath(sessionId: string, timerId?: string) {
  const base = `/api/sessions/${sessionId}/timers`;
  return timerId ? `${base}/${timerId}` : base;
}

export async function fetchTimerState(sessionId: string): Promise<TimerState> {
  const timers = await timerRequest<SessionTimer[]>(timerPath(sessionId));
  return { timer: timers[0] ?? null };
}

export function createTimer(sessionId: string, input: CreateTimerInput) {
  return timerRequest<SessionTimer>(timerPath(sessionId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function startTimer(sessionId: string, timerId: string) {
  return timerRequest<SessionTimer>(`${timerPath(sessionId, timerId)}/start`, { method: "POST" });
}

export function pauseTimer(sessionId: string, timerId: string) {
  return timerRequest<SessionTimer>(`${timerPath(sessionId, timerId)}/pause`, { method: "POST" });
}

export function resumeTimer(sessionId: string, timerId: string) {
  return timerRequest<SessionTimer>(`${timerPath(sessionId, timerId)}/resume`, { method: "POST" });
}

export function extendTimer(sessionId: string, timerId: string, seconds: number) {
  return timerRequest<SessionTimer>(`${timerPath(sessionId, timerId)}/extend`, {
    method: "POST",
    body: JSON.stringify({ seconds }),
  });
}

export function finishTimer(sessionId: string, timerId: string) {
  return timerRequest<SessionTimer>(`${timerPath(sessionId, timerId)}/finish`, { method: "POST" });
}

export function cancelTimer(sessionId: string, timerId: string) {
  return timerRequest<SessionTimer>(`${timerPath(sessionId, timerId)}/cancel`, { method: "POST" });
}
