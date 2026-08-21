import type { Activity, ActivityQuestion, ActivityResource, Classroom } from "./types";
import { apiFetch } from "./auth-api";


type ApiErrorBody = { message?: string; fields?: Record<string, string> };

export class ActivityApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly fields?: Record<string, string>) {
    super(message);
    this.name = "ActivityApiError";
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
    throw new ActivityApiError(body?.message || `Falha na API de atividades (${response.status}).`, response.status, body?.fields);
  }
  return (await response.json()) as T;
}

type ActivityView = {
  id: string;
  classroomId: string;
  title: string;
  topic: string | null;
  points: number;
  onTimeBonus: number;
  resource: { kind: "INTERNAL" | "EXTERNAL"; platform: string | null; url: string | null };
  questions: Array<ActivityQuestion & { id: string }>;
  createdAt: string;
  updatedAt: string;
  copiedFromActivityId: string | null;
  copiedFromClassroomId: string | null;
};

export type ActivityUpsertInput = {
  classroomId: string;
  title: string;
  topic?: string;
  points: number;
  onTimeBonus: number;
  resource?: ActivityResource;
  questions?: ActivityQuestion[];
};

function mapActivity(row: ActivityView): Activity {
  return {
    id: row.id,
    classroomId: row.classroomId,
    title: row.title,
    topic: row.topic ?? undefined,
    points: row.points,
    onTimeBonus: row.onTimeBonus,
    resource: {
      kind: row.resource?.kind ?? "INTERNAL",
      platform: row.resource?.platform ?? undefined,
      url: row.resource?.url ?? undefined,
    },
    questions: row.questions ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    copiedFromActivityId: row.copiedFromActivityId ?? undefined,
    copiedFromClassroomId: row.copiedFromClassroomId ?? undefined,
  };
}

export async function fetchActivities(classroomId: string): Promise<Activity[]> {
  const rows = await request<ActivityView[]>(`/api/activities?classroomId=${encodeURIComponent(classroomId)}`);
  return rows.map(mapActivity);
}

export async function fetchActivityDomain(classrooms: Classroom[]): Promise<Activity[]> {
  if (!classrooms.length) return [];
  const groups = await Promise.all(classrooms.map((classroom) => fetchActivities(classroom.id)));
  return groups.flat();
}

export async function createActivity(input: ActivityUpsertInput): Promise<Activity> {
  const row = await request<ActivityView>("/api/activities", { method: "POST", body: JSON.stringify(input) });
  return mapActivity(row);
}

export async function updateActivity(id: string, input: ActivityUpsertInput): Promise<Activity> {
  const row = await request<ActivityView>(`/api/activities/${id}`, { method: "PUT", body: JSON.stringify(input) });
  return mapActivity(row);
}

export async function copyActivity(id: string, destinationClassroomId: string): Promise<Activity> {
  const row = await request<ActivityView>(`/api/activities/${id}/copy`, {
    method: "POST",
    body: JSON.stringify({ destinationClassroomId }),
  });
  return mapActivity(row);
}
