import type {
  ActivityStep,
  ActivityStepType,
  BossState,
  GameSession,
  PollOption,
  SessionRuntimeState,
} from "./types";
import { apiFetch } from "./auth-api";
import type { LiveStageState } from "./live-stage-api";


type ApiErrorBody = { message?: string; fields?: Record<string, string> };

export class MechanicsApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly fields?: Record<string, string>) {
    super(message);
    this.name = "MechanicsApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try { body = (await response.json()) as ApiErrorBody; } catch { body = undefined; }
    throw new MechanicsApiError(body?.message || `Falha na API de mecânicas (${response.status}).`, response.status, body?.fields);
  }
  return (await response.json()) as T;
}

type RuntimeView = {
  sessionId: string;
  drawCounts: Record<string, number>;
  lastDrawnStudentId: string | null;
  boss: BossState | null;
  activityId: string | null;
  currentQuestionId: string | null;
  answeredQuestionIds: string[];
  currentStepId: string | null;
  currentStepPosition: number | null;
  groups: string[][];
  groupSize: number;
};

type DrawResult = { studentId: string; runtime: RuntimeView };
type GroupsResult = { groups: string[][]; runtime: RuntimeView };
type ArenaQuestionResult = { questionId: string | null; completed: boolean; runtime: RuntimeView };

type LiveStepView = {
  id: string;
  position: number;
  type: ActivityStepType;
  title: string | null;
  instructions: string | null;
  questionId: string | null;
  slideContent: string | null;
  wordCloud: {
    prompt: string;
    maxWordsPerParticipant: number | null;
    liveReveal: boolean;
  } | null;
  poll: {
    prompt: string;
    options: PollOption[];
    liveResults: boolean;
  } | null;
};

type LiveFlowView = {
  sessionId: string;
  activityId: string | null;
  activityTitle: string | null;
  steps: LiveStepView[];
  currentIndex: number | null;
  started: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
};

type LiveFlowResultView = {
  liveFlow: LiveFlowView;
  runtime: RuntimeView;
  stage: LiveStageState;
};

export type LiveFlowState = {
  sessionId: string;
  activityId?: string;
  activityTitle?: string;
  steps: ActivityStep[];
  currentIndex?: number;
  started: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
};

export type LiveFlowNavigationResult = {
  liveFlow: LiveFlowState;
  runtime: SessionRuntimeState;
  stage: LiveStageState;
};

function mapLiveFlow(row: LiveFlowView): LiveFlowState {
  return {
    sessionId: row.sessionId,
    activityId: row.activityId ?? undefined,
    activityTitle: row.activityTitle ?? undefined,
    steps: (row.steps ?? []).map((step) => ({
      id: step.id,
      position: step.position,
      type: step.type,
      title: step.title ?? undefined,
      instructions: step.instructions ?? undefined,
      questionId: step.questionId ?? undefined,
      slideContent: step.slideContent ?? undefined,
      wordCloud: step.wordCloud
        ? {
            prompt: step.wordCloud.prompt,
            maxWordsPerParticipant:
              step.wordCloud.maxWordsPerParticipant ?? 1,
            liveReveal: step.wordCloud.liveReveal,
          }
        : undefined,
      poll: step.poll
        ? {
            prompt: step.poll.prompt,
            options: step.poll.options ?? [],
            liveResults: step.poll.liveResults,
          }
        : undefined,
    })),
    currentIndex: row.currentIndex ?? undefined,
    started: row.started,
    hasPrevious: row.hasPrevious,
    hasNext: row.hasNext,
  };
}

export function mapRuntime(row: RuntimeView): SessionRuntimeState {
  return {
    sessionId: row.sessionId,
    drawCounts: row.drawCounts ?? {},
    lastDrawnStudentId: row.lastDrawnStudentId ?? undefined,
    boss: row.boss ?? undefined,
    activityId: row.activityId ?? undefined,
    currentQuestionId: row.currentQuestionId ?? undefined,
    answeredQuestionIds: row.answeredQuestionIds ?? [],
    currentStepId: row.currentStepId ?? undefined,
    currentStepPosition: row.currentStepPosition ?? undefined,
    groups: row.groups ?? [],
    groupSize: row.groupSize ?? 2,
  };
}

export function mergeSessionMechanics(session: GameSession, runtime: SessionRuntimeState): GameSession {
  return {
    ...session,
    drawCounts: runtime.drawCounts ?? {},
    lastDrawnStudentId: runtime.lastDrawnStudentId,
    boss: runtime.boss,
    activityId: runtime.activityId,
    currentQuestionId: runtime.currentQuestionId,
    answeredQuestionIds: runtime.answeredQuestionIds ?? [],
    currentStepId: runtime.currentStepId,
    currentStepPosition: runtime.currentStepPosition,
    groups: runtime.groups ?? [],
    groupSize: runtime.groupSize ?? 2,
  };
}

export async function fetchSessionMechanics(sessionId: string): Promise<SessionRuntimeState> {
  return mapRuntime(await request<RuntimeView>(`/api/sessions/${sessionId}/mechanics`));
}

export async function drawStudent(sessionId: string): Promise<{ studentId: string; runtime: SessionRuntimeState }> {
  const result = await request<DrawResult>(`/api/sessions/${sessionId}/mechanics/draw`, { method: "POST" });
  return { studentId: result.studentId, runtime: mapRuntime(result.runtime) };
}

export async function organizeGroups(sessionId: string, groupSize: number): Promise<{ groups: string[][]; runtime: SessionRuntimeState }> {
  const result = await request<GroupsResult>(`/api/sessions/${sessionId}/mechanics/groups`, {
    method: "POST",
    body: JSON.stringify({ groupSize }),
  });
  return { groups: result.groups, runtime: mapRuntime(result.runtime) };
}

export async function startBoss(sessionId: string, name: string, maxHp: number): Promise<SessionRuntimeState> {
  return mapRuntime(await request<RuntimeView>(`/api/sessions/${sessionId}/mechanics/boss`, {
    method: "POST",
    body: JSON.stringify({ name, maxHp }),
  }));
}

export async function damageBoss(sessionId: string, amount: number): Promise<SessionRuntimeState> {
  return mapRuntime(await request<RuntimeView>(`/api/sessions/${sessionId}/mechanics/boss/damage`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  }));
}

export async function setArenaActivity(sessionId: string, activityId?: string): Promise<SessionRuntimeState> {
  return mapRuntime(await request<RuntimeView>(`/api/sessions/${sessionId}/mechanics/arena`, {
    method: "PUT",
    body: JSON.stringify({ activityId: activityId || null }),
  }));
}

export async function nextArenaQuestion(sessionId: string): Promise<{ questionId?: string; completed: boolean; runtime: SessionRuntimeState }> {
  const result = await request<ArenaQuestionResult>(`/api/sessions/${sessionId}/mechanics/arena/next`, { method: "POST" });
  return { questionId: result.questionId ?? undefined, completed: result.completed, runtime: mapRuntime(result.runtime) };
}

export async function restartArenaQuestions(sessionId: string): Promise<SessionRuntimeState> {
  return mapRuntime(await request<RuntimeView>(`/api/sessions/${sessionId}/mechanics/arena/restart`, { method: "POST" }));
}


export async function fetchLiveFlow(
  sessionId: string,
): Promise<LiveFlowState> {
  return mapLiveFlow(
    await request<LiveFlowView>(
      `/api/sessions/${sessionId}/mechanics/arena/flow`,
    ),
  );
}

async function liveFlowCommand(
  sessionId: string,
  command: "start" | "next" | "previous",
): Promise<LiveFlowNavigationResult> {
  const result = await request<LiveFlowResultView>(
    `/api/sessions/${sessionId}/mechanics/arena/flow/${command}`,
    { method: "POST" },
  );

  return {
    liveFlow: mapLiveFlow(result.liveFlow),
    runtime: mapRuntime(result.runtime),
    stage: result.stage,
  };
}

export function startLiveFlow(
  sessionId: string,
): Promise<LiveFlowNavigationResult> {
  return liveFlowCommand(sessionId, "start");
}

export function nextLiveFlow(
  sessionId: string,
): Promise<LiveFlowNavigationResult> {
  return liveFlowCommand(sessionId, "next");
}

export function previousLiveFlow(
  sessionId: string,
): Promise<LiveFlowNavigationResult> {
  return liveFlowCommand(sessionId, "previous");
}
