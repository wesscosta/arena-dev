import { apiFetch } from "./auth-api";

export type LiveStageType =
  | "IDLE"
  | "DRAW"
  | "SLIDE"
  | "QUESTION"
  | "QUIZ"
  | "WORD_CLOUD"
  | "POLL"
  | "BUZZER"
  | "BOSS_BATTLE"
  | "TIMER";

export type LiveStageAudience = "PROJECTOR" | "PARTICIPANTS" | "BOTH";

export type LiveStageState = {
  sessionId: string;
  primary: {
    type: LiveStageType;
    sourceId?: string | null;
    displayName?: string | null;
    activatedAt?: string | null;
  };
  overlays: {
    timer: boolean;
  };
  audience: LiveStageAudience;
  occurredAt?: string | null;
};

export type ActivateLiveStageInput = {
  type: LiveStageType;
  sourceId?: string | null;
  audience?: LiveStageAudience;
  timerOverlay?: boolean;
};

type ApiErrorBody = { message?: string };

export class LiveStageApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "LiveStageApiError";
  }
}

export function emptyLiveStageState(sessionId = ""): LiveStageState {
  return {
    sessionId,
    primary: {
      type: "IDLE",
      sourceId: null,
      displayName: null,
      activatedAt: null,
    },
    overlays: { timer: true },
    audience: "BOTH",
    occurredAt: null,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new LiveStageApiError(
      body?.message || `Falha na API do palco ao vivo (${response.status}).`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

export function fetchLiveStageState(sessionId: string) {
  return request<LiveStageState>(`/api/sessions/${sessionId}/stage`);
}

export function activateLiveStage(sessionId: string, input: ActivateLiveStageInput) {
  return request<LiveStageState>(`/api/sessions/${sessionId}/stage`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function clearLiveStage(sessionId: string) {
  return request<LiveStageState>(`/api/sessions/${sessionId}/stage/idle`, {
    method: "POST",
  });
}
