import type { BossState, GameSession, SessionRuntimeState } from "./types";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

type ApiErrorBody = { message?: string; fields?: Record<string, string> };

export class MechanicsApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly fields?: Record<string, string>) {
    super(message);
    this.name = "MechanicsApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
  groups: string[][];
  groupSize: number;
};

type DrawResult = { studentId: string; runtime: RuntimeView };
type GroupsResult = { groups: string[][]; runtime: RuntimeView };
type ArenaQuestionResult = { questionId: string | null; completed: boolean; runtime: RuntimeView };

export function mapRuntime(row: RuntimeView): SessionRuntimeState {
  return {
    sessionId: row.sessionId,
    drawCounts: row.drawCounts ?? {},
    lastDrawnStudentId: row.lastDrawnStudentId ?? undefined,
    boss: row.boss ?? undefined,
    activityId: row.activityId ?? undefined,
    currentQuestionId: row.currentQuestionId ?? undefined,
    answeredQuestionIds: row.answeredQuestionIds ?? [],
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
