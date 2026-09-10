import { apiFetch } from "./auth-api";

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

type ApiErrorBody = { message?: string };

export class WordCloudApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "WordCloudApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new WordCloudApiError(
      body?.message || `Falha na API da Nuvem de Palavras (${response.status}).`,
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function wordCloudPath(sessionId: string, roundId?: string) {
  const base = `/api/sessions/${sessionId}/word-cloud`;
  return roundId ? `${base}/${roundId}` : base;
}

export function fetchWordCloudState(sessionId: string) {
  return request<WordCloudState>(wordCloudPath(sessionId));
}

export function createWordCloud(sessionId: string, input: CreateWordCloudInput) {
  return request<WordCloudState>(wordCloudPath(sessionId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function revealWordCloud(sessionId: string, roundId: string) {
  return request<WordCloudState>(`${wordCloudPath(sessionId, roundId)}/reveal`, {
    method: "POST",
  });
}

export function closeWordCloud(sessionId: string, roundId: string) {
  return request<WordCloudState>(`${wordCloudPath(sessionId, roundId)}/close`, {
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
