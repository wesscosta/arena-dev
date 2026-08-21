import type { Classroom, ScoreCategory, ScoreEvent, ScoreSource } from "./types";
import { apiFetch } from "./auth-api";


type ApiErrorBody = { message?: string; fields?: Record<string, string> };

export class ScoreApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly fields?: Record<string, string>) {
    super(message);
    this.name = "ScoreApiError";
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
    throw new ScoreApiError(body?.message || `Falha na API de XP (${response.status}).`, response.status, body?.fields);
  }
  return (await response.json()) as T;
}

type ScoreEventView = {
  id: string;
  classroomId: string;
  studentId: string;
  sessionId: string | null;
  points: number;
  category: ScoreCategory;
  description: string;
  source: ScoreSource;
  activityId: string | null;
  questionId: string | null;
  createdAt: string;
  reversalOf: string | null;
  reversed: boolean;
};

export type CreateScoreEventInput = {
  classroomId: string;
  studentId: string;
  sessionId?: string;
  points: number;
  category: ScoreCategory;
  description: string;
  source?: ScoreSource;
  activityId?: string;
  questionId?: string;
};

function mapEvent(row: ScoreEventView): ScoreEvent {
  return {
    id: row.id,
    classroomId: row.classroomId,
    studentId: row.studentId,
    sessionId: row.sessionId ?? undefined,
    points: row.points,
    category: row.category,
    description: row.description,
    source: row.source,
    activityId: row.activityId ?? undefined,
    questionId: row.questionId ?? undefined,
    createdAt: row.createdAt,
    reversalOf: row.reversalOf ?? undefined,
    reversed: row.reversed,
  };
}

export async function fetchScoreEvents(classroomId: string): Promise<ScoreEvent[]> {
  const rows = await request<ScoreEventView[]>(`/api/score-events?classroomId=${encodeURIComponent(classroomId)}`);
  return rows.map(mapEvent);
}

export async function fetchScoreDomain(classrooms: Classroom[]): Promise<ScoreEvent[]> {
  if (!classrooms.length) return [];
  const groups = await Promise.all(classrooms.map((classroom) => fetchScoreEvents(classroom.id)));
  return groups.flat();
}

export async function createScoreEvent(input: CreateScoreEventInput): Promise<ScoreEvent> {
  const row = await request<ScoreEventView>("/api/score-events", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return mapEvent(row);
}

export async function createScoreEvents(inputs: CreateScoreEventInput[]): Promise<ScoreEvent[]> {
  if (!inputs.length) return [];
  const rows = await request<ScoreEventView[]>("/api/score-events/batch", {
    method: "POST",
    body: JSON.stringify(inputs),
  });
  return rows.map(mapEvent);
}

export async function reverseScoreEvent(eventId: string): Promise<ScoreEvent> {
  const row = await request<ScoreEventView>(`/api/score-events/${eventId}/reverse`, { method: "POST" });
  return mapEvent(row);
}
