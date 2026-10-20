import { apiRequest } from "./http/client";
import { HttpApiError } from "./http/errors";

export type RankingLimit = "TOP_5" | "ALL";

export type RankingPresentation = {
  visible: boolean;
  anonymized: boolean;
  limit: RankingLimit;
};

export type RankingEntry = {
  participantId: string;
  studentId: string;
  fullName: string;
  displayName: string;
  score: number;
  position: number;
  hasScoreEvents: boolean;
  present: boolean;
  connected: boolean;
};

export type SessionRankingState = {
  sessionId: string;
  presentation: RankingPresentation;
  hasScoreEvents: boolean;
  scoredParticipantCount: number;
  entries: RankingEntry[];
  generatedAt: string;
};

export type PublicRankingEntry = {
  position: number;
  displayName: string;
  score: number;
};

export type PublicRankingState = {
  sessionId: string;
  visible: boolean;
  anonymized: boolean;
  limit: RankingLimit;
  hasScoreEvents: boolean;
  scoredParticipantCount: number;
  entries: PublicRankingEntry[];
  generatedAt: string;
};

export type RankingPresentationInput = {
  visible?: boolean;
  anonymized?: boolean;
  limit?: RankingLimit;
};

export class RankingApiError extends HttpApiError {
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message, status, fields);
    this.name = "RankingApiError";
  }
}

function rankingRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init, {
    errorMessage: (status) => `Falha na API de ranking (${status}).`,
    errorFactory: (message, status) => new RankingApiError(message, status),
  });
}

export function emptyPublicRankingState(sessionId = ""): PublicRankingState {
  return {
    sessionId,
    visible: false,
    anonymized: true,
    limit: "TOP_5",
    hasScoreEvents: false,
    scoredParticipantCount: 0,
    entries: [],
    generatedAt: new Date(0).toISOString(),
  };
}

export function fetchSessionRanking(sessionId: string) {
  return rankingRequest<SessionRankingState>(`/api/sessions/${sessionId}/ranking`);
}

export function updateRankingPresentation(
  sessionId: string,
  input: RankingPresentationInput,
) {
  return rankingRequest<SessionRankingState>(
    `/api/sessions/${sessionId}/ranking/presentation`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}
