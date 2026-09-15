import { apiFetch } from "./auth-api";

export type AssessmentFeedback = {
  assessmentId: string;
  submissionId: string;
  submissionStatus: "SUBMITTED" | "UNDER_REVIEW" | "GRADED" | "RETURNED";
  feedbackDraft: string | null;
  publishedFeedback: string | null;
  publishedAt: string | null;
};

type ApiErrorBody = { message?: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try { body = (await response.json()) as ApiErrorBody; } catch { body = undefined; }
    throw new Error(body?.message || `Falha ao trabalhar com feedback (${response.status}).`);
  }
  return (await response.json()) as T;
}

function base(activityId: string, submissionId: string) {
  return `/api/activities/${activityId}/submissions/${submissionId}/assessment/feedback`;
}

export function fetchAssessmentFeedback(activityId: string, submissionId: string) {
  return request<AssessmentFeedback>(base(activityId, submissionId));
}

export function saveAssessmentFeedbackDraft(activityId: string, submissionId: string, feedback: string) {
  return request<AssessmentFeedback>(`${base(activityId, submissionId)}/draft`, {
    method: "PUT",
    body: JSON.stringify({ feedback }),
  });
}

export function useLatestAiFeedback(activityId: string, submissionId: string) {
  return request<AssessmentFeedback>(`${base(activityId, submissionId)}/from-ai`, { method: "POST" });
}

export function publishAssessmentFeedback(activityId: string, submissionId: string) {
  return request<AssessmentFeedback>(`${base(activityId, submissionId)}/publish`, { method: "POST" });
}
