import { apiFetch } from "./auth-api";

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

export async function fetchSubmissionEvidence(activityId: string, submissionId: string) {
  const response = await apiFetch(`/api/activities/${activityId}/submissions/${submissionId}/evidence`);
  if (!response.ok) {
    let message = `Falha ao carregar evidências (${response.status}).`;
    try {
      const body = await response.json() as { message?: string };
      if (body.message) message = body.message;
    } catch {}
    throw new Error(message);
  }
  return await response.json() as SubmissionEvidence;
}
