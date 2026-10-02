import { apiRequest } from "./http/client";

export type WordCloudStatus = "COLLECTING" | "REVEALED" | "CLOSED";

export type WordCloudTerm = {
  text: string;
  normalizedText: string;
  count: number;
};

export type WordCloudRound = {
  id: string;
  sessionId: string;
  prompt: string;
  status: WordCloudStatus;
  liveReveal: boolean;
  maxWordsPerParticipant: number;
  participantCount: number;
  submissionCount: number;
  terms: WordCloudTerm[];
  revealedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WordCloudState = {
  round: WordCloudRound | null;
};

export type WordCloudParticipantState = {
  roundId: string | null;
  canSubmit: boolean;
  maxWords: number;
  remainingWords: number;
  submittedWords: string[];
};

export type CreateWordCloudInput = {
  prompt: string;
  liveReveal: boolean;
  maxWordsPerParticipant: number;
};


export class WordCloudApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "WordCloudApiError";
  }
}

function wordCloudRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init, {
    errorMessage: (status) => `Falha na API da Nuvem de Palavras (${status}).`,
    errorFactory: (message, status) => new WordCloudApiError(message, status),
  });
}

function wordCloudPath(sessionId: string, roundId?: string) {
  const base = `/api/sessions/${sessionId}/word-cloud`;
  return roundId ? `${base}/${roundId}` : base;
}

export function fetchWordCloudState(sessionId: string) {
  return wordCloudRequest<WordCloudState>(wordCloudPath(sessionId));
}

export function createWordCloud(sessionId: string, input: CreateWordCloudInput) {
  return wordCloudRequest<WordCloudState>(wordCloudPath(sessionId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function revealWordCloud(sessionId: string, roundId: string) {
  return wordCloudRequest<WordCloudState>(`${wordCloudPath(sessionId, roundId)}/reveal`, {
    method: "POST",
  });
}

export function closeWordCloud(sessionId: string, roundId: string) {
  return wordCloudRequest<WordCloudState>(`${wordCloudPath(sessionId, roundId)}/close`, {
    method: "POST",
  });
}

export function emptyWordCloudParticipantState(): WordCloudParticipantState {
  return {
    roundId: null,
    canSubmit: false,
    maxWords: 0,
    remainingWords: 0,
    submittedWords: [],
  };
}

export function sendWordCloudSubmission(socket: WebSocket, words: string[]) {
  if (socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify({ type: "WORD_CLOUD_SUBMIT", words }));
  return true;
}
