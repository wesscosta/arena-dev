import { apiRequest } from "./http/client";
import { normalizeJoinCode } from "./app-state";

export type InteractionRunStatus = "CREATED" | "ACTIVE" | "CLOSED";

export type LearningTargetType = "TOPIC" | "OBJECTIVE" | "COMPETENCY";
export type LearningTargetStatus = "ACTIVE" | "ARCHIVED";

export type LearningTarget = {
  id: string;
  title: string;
  type: LearningTargetType;
  parentId?: string | null;
  status: LearningTargetStatus;
};

export type LearningCheckOption = {
  key: string;
  label: string;
  position: number;
};

export type LearningCheckRun = {
  id: string;
  status: InteractionRunStatus;
  sequence: number;
  acceptsResponses: boolean;
  resultsVisiblePublicly: boolean;
  openedAt?: string | null;
  responsesLockedAt?: string | null;
  resultsRevealedAt?: string | null;
  closedAt?: string | null;
};

export type LearningCheckDefinition = {
  id: string;
  prompt: string;
  learningTargetId: string;
  learningTargetTitle: string;
  options: LearningCheckOption[];
};

export type LearningCheckResult = {
  runId: string;
  sessionId: string;
  interactionDefinitionId: string;
  responseKind: "CHOICE" | "TEXT";
  evaluationMode: "NONE" | "CORRECT_ANSWER";
  participation: {
    participantCount: number;
    responseCount: number;
    participationRate: number;
  };
  choiceDistribution: Record<string, number>;
  evaluation: {
    evaluationCount: number;
    correctCount: number;
    incorrectCount: number;
    partialCount: number;
    notEvaluatedCount: number;
    accuracy?: number | null;
  };
};

export type LearningCheckState = {
  run?: LearningCheckRun | null;
  definition?: LearningCheckDefinition | null;
  result?: LearningCheckResult | null;
  evidenceCount: number;
};

export type LearningCheckParticipantState = {
  runId?: string | null;
  status?: InteractionRunStatus | null;
  prompt?: string | null;
  learningTargetId?: string | null;
  learningTargetTitle?: string | null;
  options: LearningCheckOption[];
  acceptsResponses: boolean;
  answered: boolean;
  selectedOptionKey?: string | null;
  resultsVisiblePublicly: boolean;
  correctOptionKey?: string | null;
};

export type LearningCheckParticipantSignal = {
  runId: string;
  status: InteractionRunStatus;
  acceptsResponses: boolean;
  resultsVisiblePublicly: boolean;
};

export type PrepareLearningCheckInput = {
  learningTargetId: string;
  prompt: string;
  options: Array<{ key: string; label: string }>;
  correctOptionKey: string;
};

export function emptyLearningCheckState(): LearningCheckState {
  return {
    run: null,
    definition: null,
    result: null,
    evidenceCount: 0,
  };
}

export function emptyLearningCheckParticipantState(): LearningCheckParticipantState {
  return {
    runId: null,
    status: null,
    prompt: null,
    learningTargetId: null,
    learningTargetTitle: null,
    options: [],
    acceptsResponses: false,
    answered: false,
    selectedOptionKey: null,
    resultsVisiblePublicly: false,
    correctOptionKey: null,
  };
}

export function fetchLearningTargets() {
  return apiRequest<LearningTarget[]>("/api/learning-targets");
}

export function createLearningTarget(
  title: string,
  type: LearningTargetType = "OBJECTIVE",
  parentId?: string | null,
) {
  return apiRequest<LearningTarget>("/api/learning-targets", {
    method: "POST",
    body: JSON.stringify({ title, type, parentId: parentId ?? null }),
  });
}

export function fetchLearningCheckState(sessionId: string) {
  return apiRequest<LearningCheckState>(
    `/api/sessions/${sessionId}/learning-checks/current`,
  );
}

export function prepareLearningCheck(
  sessionId: string,
  input: PrepareLearningCheckInput,
) {
  return apiRequest<LearningCheckState>(
    `/api/sessions/${sessionId}/learning-checks`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

function transition(sessionId: string, runId: string, action: string) {
  return apiRequest<LearningCheckState>(
    `/api/sessions/${sessionId}/learning-checks/${runId}/${action}`,
    { method: "POST" },
  );
}

export function openLearningCheck(sessionId: string, runId: string) {
  return transition(sessionId, runId, "open");
}

export function lockLearningCheck(sessionId: string, runId: string) {
  return transition(sessionId, runId, "lock");
}

export function revealLearningCheck(sessionId: string, runId: string) {
  return transition(sessionId, runId, "reveal");
}

export function closeLearningCheck(sessionId: string, runId: string) {
  return transition(sessionId, runId, "close");
}

export function repeatLearningCheck(sessionId: string, runId: string) {
  return transition(sessionId, runId, "repeat");
}

export function fetchParticipantLearningCheck(code: string, token: string) {
  const params = new URLSearchParams({ token });
  return apiRequest<LearningCheckParticipantState>(
    `/api/join/${encodeURIComponent(normalizeJoinCode(code))}/learning-check?${params.toString()}`,
    undefined,
    { credentials: "omit" },
  );
}

export function submitLearningCheckAnswer(
  code: string,
  runId: string,
  token: string,
  optionKey: string,
) {
  return apiRequest<LearningCheckParticipantState>(
    `/api/join/${encodeURIComponent(normalizeJoinCode(code))}/learning-check/${runId}/answer`,
    {
      method: "POST",
      body: JSON.stringify({ token, optionKey }),
    },
    { credentials: "omit" },
  );
}
