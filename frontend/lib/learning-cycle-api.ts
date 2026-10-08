import { apiRequest } from "./http/client";

export type LearningCycleStatus = "DIAGNOSED" | "INTERVENED" | "VERIFIED";
export type LearningCycleView = {
  id: string;
  sessionId: string;
  learningTargetId: string;
  baselineRunId: string;
  followupRunId: string | null;
  status: LearningCycleStatus;
  interventionNote: string | null;
};
export type LearningCycleComparison = {
  cycleId: string;
  learningTargetId: string;
  baseline: { responses: number; comparable: number };
  followup: { responses: number; comparable: number };
  paired: number;
  transitions: {
    correctToCorrect: number;
    correctToIncorrect: number;
    incorrectToCorrect: number;
    incorrectToIncorrect: number;
  };
  baselineOnly: number;
  followupOnly: number;
  disclaimer: string;
};
function url(sessionId: string) {
  return `/api/sessions/${sessionId}/learning-cycles`;
}
export function fetchLearningCycles(sessionId: string) {
  return apiRequest<LearningCycleView[]>(url(sessionId));
}
export function diagnoseLearningCycle(sessionId: string, baselineRunId: string) {
  return apiRequest<LearningCycleView>(url(sessionId), {
    method: "POST",
    body: JSON.stringify({ baselineRunId }),
  });
}
export function interveneLearningCycle(sessionId: string, cycleId: string, note: string) {
  return apiRequest<LearningCycleView>(`${url(sessionId)}/${cycleId}/intervention`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}
export function verifyLearningCycle(sessionId: string, cycleId: string, followupRunId: string) {
  return apiRequest<LearningCycleView>(`${url(sessionId)}/${cycleId}/verification`, {
    method: "POST",
    body: JSON.stringify({ followupRunId }),
  });
}
export function compareLearningCycle(sessionId: string, cycleId: string) {
  return apiRequest<LearningCycleComparison>(`${url(sessionId)}/${cycleId}/comparison`);
}
