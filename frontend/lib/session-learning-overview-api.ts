import { apiRequest } from "./http/client";
import type { LearningCycleComparison, LearningCycleStatus, InterventionType } from "./learning-cycle-api";

export type LearningOverviewRow = {
  cycleId: string;
  learningTargetId: string;
  learningTargetTitle: string;
  status: LearningCycleStatus;
  interventionType: InterventionType | null;
  interventionNote: string | null;
  baselineRunId: string;
  followupRunId: string | null;
  comparison: LearningCycleComparison | null;
};

export type SessionLearningOverview = {
  sessionId: string;
  sessionTitle: string;
  enrolledInSession: number;
  presentNow: number;
  absentNow: number;
  cycles: number;
  verifiedCycles: number;
  rows: LearningOverviewRow[];
  disclaimer: string;
};

export function fetchSessionLearningOverview(sessionId: string) {
  return apiRequest<SessionLearningOverview>(
    `/api/sessions/${encodeURIComponent(sessionId)}/learning-overview`,
  );
}
