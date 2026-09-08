import { apiFetch } from "./auth-api";

export type PollStatus = "OPEN" | "REVEALED" | "CLOSED";

export type PollOption = {
  id: string;
  label: string;
  position: number;
  voteCount: number | null;
  percentage: number | null;
};

export type PollRound = {
  id: string;
  sessionId: string;
  prompt: string;
  status: PollStatus;
  liveResults: boolean;
  publicResultsVisible: boolean;
  totalVotes: number;
  options: PollOption[];
  revealedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PollState = { round: PollRound | null };

export type PollParticipantState = {
  roundId: string | null;
  canVote: boolean;
  selectedOptionId: string | null;
};

export type CreatePollInput = {
  prompt: string;
  options: string[];
  liveResults: boolean;
};

type ApiErrorBody = { message?: string };

export class PollApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "PollApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try { body = (await response.json()) as ApiErrorBody; } catch { body = undefined; }
    throw new PollApiError(body?.message || `Falha na API de Votação (${response.status}).`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function pollPath(sessionId: string, roundId?: string) {
  const base = `/api/sessions/${sessionId}/poll`;
  return roundId ? `${base}/${roundId}` : base;
}

export function fetchPollState(sessionId: string) {
  return request<PollState>(pollPath(sessionId));
}

export function createPoll(sessionId: string, input: CreatePollInput) {
  return request<PollState>(pollPath(sessionId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function revealPoll(sessionId: string, roundId: string) {
  return request<PollState>(`${pollPath(sessionId, roundId)}/reveal`, { method: "POST" });
}

export function closePoll(sessionId: string, roundId: string) {
  return request<PollState>(`${pollPath(sessionId, roundId)}/close`, { method: "POST" });
}

export function emptyPollParticipantState(): PollParticipantState {
  return { roundId: null, canVote: false, selectedOptionId: null };
}

export function sendPollVote(socket: WebSocket, optionId: string) {
  if (socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify({ type: "POLL_VOTE", optionId }));
  return true;
}
