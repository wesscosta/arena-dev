import type { Activity, ActivityQuestion, ActivityResource } from "./types";
import { apiRequest } from "./http/client";
import { HttpApiError } from "./http/errors";


export class ActivityApiError extends HttpApiError {
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message, status, fields);
    this.name = "ActivityApiError";
  }
}

function activityRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init, {
    errorMessage: (status) => `Falha na API de atividades (${status}).`,
    errorFactory: (message, status, fields) => new ActivityApiError(message, status, fields),
  });
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
  individualOptionOrder?: boolean;
  individualQuestionOrder?: boolean;
  orderLocked?: boolean;
};

export type ActivityUpsertInput = {
  classroomId: string;
  title: string;
  topic?: string;
  points: number;
  onTimeBonus: number;
  resource?: ActivityResource;
  questions?: ActivityQuestion[];
  individualOptionOrder?: boolean;
  individualQuestionOrder?: boolean;
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
    individualOptionOrder: row.individualOptionOrder ?? false,
    individualQuestionOrder: row.individualQuestionOrder ?? false,
    orderLocked: row.orderLocked ?? false,
  };
}

export async function fetchActivities(classroomId: string): Promise<Activity[]> {
  const rows = await activityRequest<ActivityView[]>(`/api/activities?classroomId=${encodeURIComponent(classroomId)}`);
  return rows.map(mapActivity);
}

export async function createActivity(input: ActivityUpsertInput): Promise<Activity> {
  const row = await activityRequest<ActivityView>("/api/activities", { method: "POST", body: JSON.stringify(input) });
  return mapActivity(row);
}

export async function updateActivity(id: string, input: ActivityUpsertInput): Promise<Activity> {
  const row = await activityRequest<ActivityView>(`/api/activities/${id}`, { method: "PUT", body: JSON.stringify(input) });
  return mapActivity(row);
}

export async function copyActivity(id: string, destinationClassroomId: string): Promise<Activity> {
  const row = await activityRequest<ActivityView>(`/api/activities/${id}/copy`, {
    method: "POST",
    body: JSON.stringify({ destinationClassroomId }),
  });
  return mapActivity(row);
}
