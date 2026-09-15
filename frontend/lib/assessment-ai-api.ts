import { apiFetch } from "./auth-api";
import type { StructuredAssessment } from "./assessment-rubric-api";

export type AiCriterionSuggestion = {
  criterionId: string;
  title: string;
  suggestedPoints: number;
  maxPoints: number | null;
  suggestedComment: string | null;
  evidence: string | null;
  confidence: number | null;
  applied: boolean;
};

export type AiAssessmentSuggestion = {
  suggestionId: string;
  provider: string;
  model: string;
  promptVersion: string;
  summaryFeedback: string | null;
  createdAt: string;
  fullyApplied: boolean;
  criteria: AiCriterionSuggestion[];
};

type ApiErrorBody = { message?: string };

async function request<T>(path: string, init?: RequestInit, allowNoContent = false): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try { body = (await response.json()) as ApiErrorBody; } catch { body = undefined; }
    throw new Error(body?.message || `Falha na correção assistida por IA (${response.status}).`);
  }
  if (allowNoContent && response.status === 204) return null as T;
  return (await response.json()) as T;
}

function base(activityId: string, submissionId: string) {
  return `/api/activities/${activityId}/submissions/${submissionId}/assessment/ai-suggestions`;
}

export function fetchLatestAiAssessmentSuggestion(activityId: string, submissionId: string) {
  return request<AiAssessmentSuggestion | null>(`${base(activityId, submissionId)}/latest`, undefined, true);
}

export function generateAiAssessmentSuggestion(activityId: string, submissionId: string) {
  return request<AiAssessmentSuggestion>(base(activityId, submissionId), { method: "POST" });
}

export function applyAiAssessmentSuggestion(activityId: string, submissionId: string, suggestionId: string) {
  return request<StructuredAssessment>(`${base(activityId, submissionId)}/${suggestionId}/apply`, { method: "POST" });
}
