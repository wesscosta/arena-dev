import { apiRequest } from "./http/client";
import { normalizeJoinCode } from "./app-state";
import { HttpApiError } from "./http/errors";

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


export class QuizApiError extends HttpApiError {
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message, status, fields);
    this.name = "QuizApiError";
  }
}

function teacherRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init, {
    errorMessage: (status) => `Falha na API de Quiz (${status}).`,
    errorFactory: (message, status) => new QuizApiError(message, status),
  });
}

function quizPath(sessionId: string, roundId?: string) {
  const base = `/api/sessions/${sessionId}/quiz`;
  return roundId ? `${base}/${roundId}` : base;
}

export function fetchQuizState(sessionId: string) {
  return teacherRequest<QuizState>(quizPath(sessionId));
}

export function prepareQuiz(sessionId: string, questionId: string) {
  return teacherRequest<QuizState>(quizPath(sessionId), {
    method: "POST",
    body: JSON.stringify({ questionId }),
  });
}

export function openQuiz(sessionId: string, roundId: string) {
  return teacherRequest<QuizState>(`${quizPath(sessionId, roundId)}/open`, { method: "POST" });
}

export function lockQuiz(sessionId: string, roundId: string) {
  return teacherRequest<QuizState>(`${quizPath(sessionId, roundId)}/lock`, { method: "POST" });
}

export function revealQuiz(sessionId: string, roundId: string) {
  return teacherRequest<QuizState>(`${quizPath(sessionId, roundId)}/reveal`, { method: "POST" });
}

export function closeQuiz(sessionId: string, roundId: string) {
  return teacherRequest<QuizState>(`${quizPath(sessionId, roundId)}/close`, { method: "POST" });
}

export function quizOptionMatchesAnswer(optionId: string, answer: string | boolean | null) {
  if (typeof answer === "boolean") return optionId === String(answer);
  return answer !== null && optionId === answer;
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

export function sendQuizAnswer(
  code: string,
  roundId: string,
  token: string,
  answer: string | boolean,
): Promise<QuizParticipantState> {
  return apiRequest<QuizParticipantState>(
    `/api/join/${encodeURIComponent(normalizeJoinCode(code))}/quiz/${encodeURIComponent(roundId)}/answer`,
    {
      method: "POST",
      body: JSON.stringify({ token, answer }),
    },
    {
      credentials: "omit",
      errorMessage: (status) => `Falha ao enviar resposta do Quiz (${status}).`,
      errorFactory: (message, status) => new QuizApiError(message, status),
    },
  );
}
