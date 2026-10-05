import { apiRequest } from "./http/client";

export type RubricCriterion = {
  id: string;
  title: string;
  description: string | null;
  maxPoints: number;
  position: number;
};

export type ActivityRubric = {
  activityId: string;
  maxPoints: number;
  criteria: RubricCriterion[];
};

export type AssessmentCriterion = {
  id: string;
  title: string;
  description: string | null;
  maxPoints: number;
  awardedPoints: number | null;
  teacherComment: string | null;
  position: number;
};

export type StructuredAssessment = {
  assessmentId: string;
  submissionId: string;
  submissionStatus: "SUBMITTED" | "UNDER_REVIEW" | "GRADED" | "RETURNED";
  awardedPoints: number;
  maxPoints: number;
  complete: boolean;
  criteria: AssessmentCriterion[];
};


function assessmentRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init, {
    errorMessage: (status) => `Falha na avaliação (${status}).`,
  });
}

export function fetchActivityRubric(activityId: string) {
  return assessmentRequest<ActivityRubric>(`/api/activities/${activityId}/rubric`);
}

export function replaceActivityRubric(
  activityId: string,
  criteria: Array<{ title: string; description?: string | null; maxPoints: number }>,
) {
  return assessmentRequest<ActivityRubric>(`/api/activities/${activityId}/rubric`, {
    method: "PUT",
    body: JSON.stringify({ criteria }),
  });
}

export function fetchStructuredAssessment(activityId: string, submissionId: string) {
  return assessmentRequest<StructuredAssessment>(`/api/activities/${activityId}/submissions/${submissionId}/assessment`);
}

export function scoreAssessmentCriterion(
  activityId: string,
  submissionId: string,
  criterionId: string,
  awardedPoints: number,
  teacherComment?: string | null,
) {
  return assessmentRequest<StructuredAssessment>(
    `/api/activities/${activityId}/submissions/${submissionId}/assessment/criteria/${criterionId}`,
    {
      method: "PUT",
      body: JSON.stringify({ awardedPoints, teacherComment: teacherComment || null }),
    },
  );
}

export function gradeStructuredAssessment(activityId: string, submissionId: string) {
  return assessmentRequest<StructuredAssessment>(
    `/api/activities/${activityId}/submissions/${submissionId}/assessment/grade`,
    { method: "POST" },
  );
}
