
import { apiFetch } from "./auth-api";

export type SubmissionDashboardStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "UNDER_REVIEW" | "GRADED" | "RETURNED";
export type SubmissionSource = "ARENA" | "TEAMS" | "GOOGLE_CLASSROOM" | "IMPORT";

export type SubmissionDashboardSummary = {
  total: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  underReview: number;
  graded: number;
  returned: number;
};

export type SubmissionDashboardStudent = {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  displayName: string;
  registration: string | null;
  status: SubmissionDashboardStatus;
  submissionId: string | null;
  source: SubmissionSource | null;
  attemptNumber: number | null;
  startedAt: string | null;
  submittedAt: string | null;
  updatedAt: string | null;
  itemCount: number;
};

export type SubmissionDashboard = {
  activityId: string;
  activityTitle: string;
  classroomId: string;
  summary: SubmissionDashboardSummary;
  students: SubmissionDashboardStudent[];
};

type ApiErrorBody = { message?: string };

export async function fetchSubmissionDashboard(activityId: string): Promise<SubmissionDashboard> {
  const response = await apiFetch(`/api/activities/${encodeURIComponent(activityId)}/submissions/dashboard`);
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try { body = (await response.json()) as ApiErrorBody; } catch { body = undefined; }
    throw new Error(body?.message || `Falha ao carregar entregas (${response.status}).`);
  }
  return (await response.json()) as SubmissionDashboard;
}
