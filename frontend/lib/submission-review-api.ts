
import { apiFetch } from "./auth-api";
import type { SubmissionDashboardStatus } from "./submission-dashboard-api";

export type SubmissionReviewItem = {
  id: string;
  kind: "QUESTION_RESPONSE" | "TEXT" | "LINK" | "CODE" | "FILE" | "ARTIFACT";
  questionId: string | null;
  position: number;
  content: unknown;
};

export type SubmissionReviewQuestion = {
  id: string;
  type: string;
  statement: string;
  expectedAnswer: unknown;
  explanation: string | null;
  evaluationCriteriaJson: string | null;
  code: string | null;
  language: string | null;
};

export type SubmissionReview = {
  submissionId: string;
  activityId: string;
  activityTitle: string;
  enrollmentId: string;
  studentId: string;
  studentName: string;
  displayName: string;
  status: SubmissionDashboardStatus;
  attemptNumber: number;
  submittedAt: string | null;
  items: SubmissionReviewItem[];
  questions: SubmissionReviewQuestion[];
  assessmentId: string;
  teacherNotes: string | null;
  assessmentUpdatedAt: string;
};

async function request(path: string, init?: RequestInit): Promise<SubmissionReview> {
  const response = await apiFetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`Falha ao carregar correção (${response.status}).`);
  return (await response.json()) as SubmissionReview;
}

export function openSubmissionReview(activityId: string, submissionId: string) {
  return request(`/api/activities/${activityId}/submissions/${submissionId}/review/open`, { method: "POST", body: "{}" });
}

export function saveSubmissionReviewNotes(activityId: string, submissionId: string, teacherNotes: string) {
  return request(`/api/activities/${activityId}/submissions/${submissionId}/review/notes`, {
    method: "PUT",
    body: JSON.stringify({ teacherNotes }),
  });
}
