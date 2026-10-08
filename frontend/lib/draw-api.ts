import { apiRequest } from "./http/client";

export type DrawPolicy = "ROUND_ROBIN_SHUFFLED" | "BALANCED_WEIGHTED";
export type DrawOutcome = "PENDING" | "CONFIRMED" | "PASSED" | "VOIDED";
export type DrawAttempt = {
  attemptId: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  sequence: number;
  roundNumber: number;
  policy: DrawPolicy;
  status: DrawOutcome;
  scoreEventId: string | null;
  scoreReversed: boolean;
  selectedAt: string;
  resolvedAt: string | null;
};
export type DrawState = {
  sessionId: string;
  policy: DrawPolicy;
  roundNumber: number;
  revision: number;
  calledUniqueCount: number;
  confirmedCount: number;
  passedCount: number;
  voidedCount: number;
  presentCount: number;
  eligibleCurrentRoundCount: number;
  canStartNextRound: boolean;
  currentAttempt: DrawAttempt | null;
  history: DrawAttempt[];
};

function request<T>(sessionId: string, path: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(`/api/sessions/${sessionId}/draw-attempts${path}`, options);
}
export const getDrawState = (sessionId: string) => request<DrawState>(sessionId, "/state");
export const selectDrawParticipant = (sessionId: string, requestId: string) =>
  request<DrawAttempt>(sessionId, "", { method: "POST", body: JSON.stringify({ requestId }) });
export const resolveDrawParticipant = (
  sessionId: string,
  attemptId: string,
  requestId: string,
  outcome: "CONFIRMED" | "PASSED" | "VOIDED",
  score?: { points: number; category: string; reason: string },
) =>
  request<DrawAttempt>(sessionId, `/${attemptId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ requestId, outcome, score: score ?? null }),
  });
export const updateDrawPolicy = (sessionId: string, policy: DrawPolicy) =>
  request<DrawState>(sessionId, "/policy", { method: "PUT", body: JSON.stringify({ policy }) });
export const startNextDrawRound = (sessionId: string, requestId: string) =>
  request<DrawState>(sessionId, "/next-round", {
    method: "POST",
    body: JSON.stringify({ requestId }),
  });
