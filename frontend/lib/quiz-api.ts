import { apiFetch } from "./auth-api";
import { normalizeJoinCode } from "./app-state";

export type QuizStatus = "READY" | "OPEN" | "LOCKED" | "REVEALED" | "CLOSED";
export type QuizQuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE";

export type QuizQuestionOption = {
  id: string;
  text: string;
};

export type QuizQuestion = {
  id: string;
  type: QuizQuestionType;
  statement: string;
  points: number;
  options: QuizQuestionOption[];
  code?: string | null;
  language?: string | null;
};

export type QuizDistribution = {
  optionId: string;
  label: string;
  answerCount: number | null;
  percentage: number | null;
};

export type QuizRound = {
  id: string;
  sessionId: string;
  status: QuizStatus;
  question: QuizQuestion | null;
  totalAnswers: number;
  publicResultsVisible: boolean;
  distribution: QuizDistribution[];
  correctAnswer: string | boolean | null;
  openedAt?: string | null;
  lockedAt?: string | null;
  revealedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuizState = {
  round: QuizRound | null;
};

export type QuizParticipantState = {
  roundId: string | null;
  status: QuizStatus | null;
  canAnswer: boolean;
  answered: boolean;
  answer: string | boolean | null;
  resultsVisible: boolean;
  correctAnswer: string | boolean | null;
  submittedAt?: string | null;
  updatedAt?: string | null;
};

type ApiErrorBody = { message?: string };

export class QuizApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "QuizApiError";
  }
}

export function emptyQuizParticipantState(): QuizParticipantState {
  return {
    roundId: null,
    status: null,
    canAnswer: false,
    answered: false,
    answer: null,
    resultsVisible: false,
    correctAnswer: null,
    submittedAt: null,
    updatedAt: null,
  };
}

export async function sendQuizAnswer(
  code: string,
  roundId: string,
  token: string,
  answer: string | boolean,
): Promise<QuizParticipantState> {
  const response = await apiFetch(
    `/api/join/${encodeURIComponent(normalizeJoinCode(code))}/quiz/${encodeURIComponent(roundId)}/answer`,
    {
      method: "POST",
      body: JSON.stringify({ token, answer }),
    },
    "omit",
  );

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try { body = (await response.json()) as ApiErrorBody; } catch { body = undefined; }
    throw new QuizApiError(body?.message || `Falha ao enviar resposta do Quiz (${response.status}).`, response.status);
  }

  return (await response.json()) as QuizParticipantState;
}
