import { apiFetch } from "./auth-api";

export type LearningResourceFormat = "MARKDOWN" | "PLAIN_TEXT" | "LINK";
export type LearningResourceSourceType = "MANUAL" | "AI" | "TEMPLATE" | "TEXT" | "MARKDOWN" | "FILE" | "URL" | "NOTION";

export type LearningResource = {
  id: string;
  classroomId: string | null;
  title: string;
  summary: string | null;
  body: string | null;
  format: LearningResourceFormat;
  sourceType: LearningResourceSourceType;
  sourceUrl: string | null;
  sourceLabel: string | null;
  libraryVisible: boolean;
  revision: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LearningResourceInput = {
  classroomId: string;
  title: string;
  summary?: string;
  body?: string;
  format?: LearningResourceFormat;
  sourceType?: LearningResourceSourceType;
  sourceUrl?: string;
  sourceLabel?: string;
};

type ApiErrorBody = { message?: string };

export class LearningResourceApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "LearningResourceApiError";
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
    throw new LearningResourceApiError(body?.message || `Falha na API de conteúdos (${response.status}).`, response.status);
  }
  return (await response.json()) as T;
}

export function fetchLearningResources(classroomId: string) {
  return request<LearningResource[]>(`/api/learning-resources?classroomId=${encodeURIComponent(classroomId)}`);
}

export function fetchLearningResource(id: string) {
  return request<LearningResource>(`/api/learning-resources/${encodeURIComponent(id)}`);
}

export function createLearningResource(input: LearningResourceInput) {
  return request<LearningResource>("/api/learning-resources", { method: "POST", body: JSON.stringify(input) });
}

export function updateLearningResource(id: string, input: LearningResourceInput) {
  return request<LearningResource>(`/api/learning-resources/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
}

export async function deleteLearningResource(id: string) {
  const response = await apiFetch(`/api/learning-resources/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try { body = (await response.json()) as ApiErrorBody; } catch { body = undefined; }
    throw new LearningResourceApiError(body?.message || `Falha ao excluir conteúdo (${response.status}).`, response.status);
  }
}

export type LibraryResourceInput = Omit<LearningResourceInput, "classroomId">;

export function fetchContentLibrary(query = "", archived = false) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (archived) params.set("archived", "true");
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request<LearningResource[]>(`/api/library/resources${suffix}`);
}

export function fetchLibraryResource(id: string) {
  return request<LearningResource>(`/api/library/resources/${encodeURIComponent(id)}`);
}

export function createLibraryResource(input: LibraryResourceInput) {
  return request<LearningResource>("/api/library/resources", { method: "POST", body: JSON.stringify(input) });
}

export function updateLibraryResource(id: string, input: LibraryResourceInput) {
  return request<LearningResource>(`/api/library/resources/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
}

export async function archiveLibraryResource(id: string) {
  const response = await apiFetch(`/api/library/resources/${encodeURIComponent(id)}/archive`, { method: "POST" });
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try { body = (await response.json()) as ApiErrorBody; } catch { body = undefined; }
    throw new LearningResourceApiError(body?.message || `Falha ao arquivar conteúdo (${response.status}).`, response.status);
  }
}
export function restoreLibraryResource(id: string) {
  return request<LearningResource>(`/api/library/resources/${encodeURIComponent(id)}/restore`, { method: "POST", body: "{}" });
}
