import { apiRequest } from "./http/client";
import { normalizeJoinCode } from "./app-state";

/** Deliberately separate from evaluator confidence in LearningEvidence. */
export type SelfConfidence = "LOW" | "MEDIUM" | "HIGH" | "SKIPPED";
export type ConfidenceSummary = {
  available: boolean;
  declarations: number;
  counts: Partial<Record<SelfConfidence, number>>;
  reason: string | null;
};

export function recordSelfConfidence(code: string, runId: string, token: string, level: SelfConfidence) {
  return apiRequest<{ level: SelfConfidence }>(
    `/api/join/${encodeURIComponent(normalizeJoinCode(code))}/learning-check/${encodeURIComponent(runId)}/confidence`,
    { method: "POST", body: JSON.stringify({ token, level }) },
    { credentials: "omit" },
  );
}

export function fetchConfidenceSummary(sessionId: string, runId: string) {
  return apiRequest<ConfidenceSummary>(
    `/api/sessions/${encodeURIComponent(sessionId)}/learning-checks/${encodeURIComponent(runId)}/confidence-summary`,
  );
}
