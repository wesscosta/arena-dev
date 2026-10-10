import { apiRequest } from "./http/client";

export type LiveStageType =
  | "IDLE"
  | "DRAW"
  | "SLIDE"
  | "QUESTION"
  | "QUIZ"
  | "LEARNING_CHECK"
  | "WORD_CLOUD"
  | "POLL"
  | "BUZZER"
  | "BOSS_BATTLE"
  | "TIMER"
  | "MATERIAL";

export type LiveStageAudience = "PROJECTOR" | "PARTICIPANTS" | "BOTH";

export type LiveStageState = {
  sessionId: string;
  primary: {
    type: LiveStageType;
    sourceId?: string | null;
    displayName?: string | null;
    step?: {
      id: string;
      title?: string | null;
      instructions?: string | null;
      slideContent?: string | null;
      question?: {
        id: string;
        type: "MULTIPLE_CHOICE" | "OPEN" | "TRUE_FALSE" | "BUG_FIX" | "ANALYSIS" | "PRACTICAL" | "SCENARIO";
        statement: string;
        points: number;
        options: Array<{ id: string; text: string }>;
        code?: string | null;
        language?: string | null;
      } | null;
    } | null;
    activatedAt?: string | null;
    sectionAnchor?: string | null;
  };
  overlays: {
    timer: boolean;
  };
  audience: LiveStageAudience;
  occurredAt?: string | null;
  stageVersion?: number;
};

export type ActivateLiveStageInput = {
  type: LiveStageType;
  sourceId?: string | null;
  audience?: LiveStageAudience;
  timerOverlay?: boolean;
};


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
      step: null,
      activatedAt: null,
    },
    overlays: { timer: true },
    audience: "BOTH",
    occurredAt: null,
  };
}

function liveStageRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init, {
    errorMessage: (status) => `Falha na API do palco ao vivo (${status}).`,
    errorFactory: (message, status) => new LiveStageApiError(message, status),
  });
}

export function fetchLiveStageState(sessionId: string) {
  return liveStageRequest<LiveStageState>(`/api/sessions/${sessionId}/stage`);
}

export function activateLiveStage(sessionId: string, input: ActivateLiveStageInput) {
  return liveStageRequest<LiveStageState>(`/api/sessions/${sessionId}/stage`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function clearLiveStage(sessionId: string) {
  return liveStageRequest<LiveStageState>(`/api/sessions/${sessionId}/stage/idle`, {
    method: "POST",
  });
}
