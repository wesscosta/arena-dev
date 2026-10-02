import { apiRequest } from "./http/client";
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


function aiAssessmentRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init, {
    errorMessage: (status) => `Falha na correção assistida por IA (${status}).`,
  });
}

function base(activityId: string, submissionId: string) {
  return `/api/activities/${activityId}/submissions/${submissionId}/assessment/ai-suggestions`;
}

export function fetchLatestAiAssessmentSuggestion(activityId: string, submissionId: string) {
  return aiAssessmentRequest<AiAssessmentSuggestion | null>(`${base(activityId, submissionId)}/latest`);
}

export function generateAiAssessmentSuggestion(activityId: string, submissionId: string) {
  return aiAssessmentRequest<AiAssessmentSuggestion>(base(activityId, submissionId), { method: "POST" });
}

export function applyAiAssessmentSuggestion(activityId: string, submissionId: string, suggestionId: string) {
  return aiAssessmentRequest<StructuredAssessment>(`${base(activityId, submissionId)}/${suggestionId}/apply`, { method: "POST" });
}
