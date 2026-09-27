import { apiFetch } from "./auth-api";

export type JourneyStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type JourneyUnlockRule = "IMMEDIATE" | "PREVIOUS_STAGE_COMPLETED";
export type JourneyCompletionRule = "MANUAL" | "ACTIVITY_SUBMITTED" | "ACTIVITY_GRADED";

export type JourneyStage = {
  id: string;
  position: number;
  title: string;
  description: string | null;
  activityId: string | null;
  unlockRule: JourneyUnlockRule;
  completionRule: JourneyCompletionRule;
};

export type Journey = {
  id: string;
  classroomId: string;
  title: string;
  description: string | null;
  status: JourneyStatus;
  stages: JourneyStage[];
  createdAt: string;
  updatedAt: string;
};

export type JourneyStageInput = {
  id?: string;
  title: string;
  description?: string;
  activityId?: string;
  unlockRule: JourneyUnlockRule;
  completionRule: JourneyCompletionRule;
};

export type JourneyInput = {
  classroomId: string;
  title: string;
  description?: string;
  stages: JourneyStageInput[];
};

type ApiErrorBody = { message?: string };

export class JourneyApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "JourneyApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try { body = (await response.json()) as ApiErrorBody; } catch { body = undefined; }
    throw new JourneyApiError(body?.message || `Falha na API de jornadas (${response.status}).`, response.status);
  }
  return (await response.json()) as T;
}

export function fetchJourneys(classroomId: string) {
  return request<Journey[]>(`/api/journeys?classroomId=${encodeURIComponent(classroomId)}`);
}

export function createJourney(input: JourneyInput) {
  return request<Journey>("/api/journeys", { method: "POST", body: JSON.stringify(input) });
}

export function updateJourney(id: string, input: JourneyInput) {
  return request<Journey>(`/api/journeys/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
}

export function publishJourney(id: string) {
  return request<Journey>(`/api/journeys/${encodeURIComponent(id)}/publish`, { method: "POST", body: "{}" });
}

export function archiveJourney(id: string) {
  return request<Journey>(`/api/journeys/${encodeURIComponent(id)}/archive`, { method: "POST", body: "{}" });
}
