import { apiRequest } from "./http/client";

export type SubmissionEvidence = {
  submissionId: string;
  attemptNumber: number;
  startedAt: string | null;
  submittedAt: string | null;
  durationSeconds: number;
  saveCount: number;
  pasteCount: number;
  pastedCharacters: number;
  highestSimilarity: { submissionId: string; score: number } | null;
  recommendation: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
  events: Array<{
    id: string;
    type: "ITEM_SAVED" | "PASTE" | "SUBMITTED";
    itemId: string | null;
    occurredAt: string;
    metadataJson: string | null;
  }>;
};

export function fetchSubmissionEvidence(activityId: string, submissionId: string) {
  return apiRequest<SubmissionEvidence>(
    `/api/activities/${activityId}/submissions/${submissionId}/evidence`,
    undefined,
    { errorMessage: (status) => `Falha ao carregar evidências (${status}).` },
  );
}
