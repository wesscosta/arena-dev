import { apiRequest } from "./http/client";

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


export class LearningResourceApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "LearningResourceApiError";
  }
}

function learningResourceRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init, {
    errorMessage: (status) => `Falha na API de conteúdos (${status}).`,
    errorFactory: (message, status) => new LearningResourceApiError(message, status),
  });
}

export function fetchLearningResources(classroomId: string) {
  return learningResourceRequest<LearningResource[]>(`/api/learning-resources?classroomId=${encodeURIComponent(classroomId)}`);
}

export function fetchLearningResource(id: string) {
  return learningResourceRequest<LearningResource>(`/api/learning-resources/${encodeURIComponent(id)}`);
}

export function createLearningResource(input: LearningResourceInput) {
  return learningResourceRequest<LearningResource>("/api/learning-resources", { method: "POST", body: JSON.stringify(input) });
}

export function updateLearningResource(id: string, input: LearningResourceInput) {
  return learningResourceRequest<LearningResource>(`/api/learning-resources/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteLearningResource(id: string) {
  return apiRequest<void>(
    `/api/learning-resources/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    {
      errorMessage: (status) => `Falha ao excluir conteúdo (${status}).`,
      errorFactory: (message, status) => new LearningResourceApiError(message, status),
    },
  );
}

export type LibraryResourceInput = Omit<LearningResourceInput, "classroomId">;

export function fetchContentLibrary(query = "", archived = false) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (archived) params.set("archived", "true");
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return learningResourceRequest<LearningResource[]>(`/api/library/resources${suffix}`);
}

export function fetchLibraryResource(id: string) {
  return learningResourceRequest<LearningResource>(`/api/library/resources/${encodeURIComponent(id)}`);
}

export function createLibraryResource(input: LibraryResourceInput) {
  return learningResourceRequest<LearningResource>("/api/library/resources", { method: "POST", body: JSON.stringify(input) });
}

export function updateLibraryResource(id: string, input: LibraryResourceInput) {
  return learningResourceRequest<LearningResource>(`/api/library/resources/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
}

export function archiveLibraryResource(id: string) {
  return apiRequest<void>(
    `/api/library/resources/${encodeURIComponent(id)}/archive`,
    { method: "POST" },
    {
      errorMessage: (status) => `Falha ao arquivar conteúdo (${status}).`,
      errorFactory: (message, status) => new LearningResourceApiError(message, status),
    },
  );
}
export function restoreLibraryResource(id: string) {
  return learningResourceRequest<LearningResource>(`/api/library/resources/${encodeURIComponent(id)}/restore`, { method: "POST", body: "{}" });
}
