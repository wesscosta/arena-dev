
import { apiRequest } from "./http/client";

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


export function fetchSubmissionDashboard(activityId: string): Promise<SubmissionDashboard> {
  return apiRequest<SubmissionDashboard>(
    `/api/activities/${encodeURIComponent(activityId)}/submissions/dashboard`,
    undefined,
    { errorMessage: (status) => `Falha ao carregar entregas (${status}).` },
  );
}
