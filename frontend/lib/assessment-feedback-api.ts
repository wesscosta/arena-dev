import { apiRequest } from "./http/client";

export type AssessmentFeedback = {
  assessmentId: string;
  submissionId: string;
  submissionStatus: "SUBMITTED" | "UNDER_REVIEW" | "GRADED" | "RETURNED";
  feedbackDraft: string | null;
  publishedFeedback: string | null;
  publishedAt: string | null;
};


function feedbackRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init, {
    errorMessage: (status) => `Falha ao trabalhar com feedback (${status}).`,
  });
}

function base(activityId: string, submissionId: string) {
  return `/api/activities/${activityId}/submissions/${submissionId}/assessment/feedback`;
}

export function fetchAssessmentFeedback(activityId: string, submissionId: string) {
  return feedbackRequest<AssessmentFeedback>(base(activityId, submissionId));
}

export function saveAssessmentFeedbackDraft(activityId: string, submissionId: string, feedback: string) {
  return feedbackRequest<AssessmentFeedback>(`${base(activityId, submissionId)}/draft`, {
    method: "PUT",
    body: JSON.stringify({ feedback }),
  });
}

export function useLatestAiFeedback(activityId: string, submissionId: string) {
  return feedbackRequest<AssessmentFeedback>(`${base(activityId, submissionId)}/from-ai`, { method: "POST" });
}

export function publishAssessmentFeedback(activityId: string, submissionId: string) {
  return feedbackRequest<AssessmentFeedback>(`${base(activityId, submissionId)}/publish`, { method: "POST" });
}
