import { apiFetch } from "./auth-api";
import type { Journey } from "./journey-api";

export type ContentIngestionSource =
  | "AI"
  | "TEMPLATE"
  | "TEXT"
  | "MARKDOWN"
  | "FILE"
  | "URL"
  | "NOTION";

export type DraftItemType =
  | "CONTENT"
  | "ACTIVITY"
  | "QUIZ"
  | "CHALLENGE"
  | "CHECKPOINT"
  | "EXTERNAL_RESOURCE";

export type ContentIngestionCapabilities = {
  aiConfigured: boolean;
  templates: string[];
  directTextSources: string[];
  supportedFileExtensions: string[];
  externalUrlSupported: boolean;
  notionLinkSupported: boolean;
};

export type ContentDraftItem = {
  title: string;
  description: string | null;
  type: DraftItemType;
  body: string | null;
  sourceUrl: string | null;
};

export type ContentDraftSection = {
  title: string;
  description: string | null;
  items: ContentDraftItem[];
};

export type ContentDraft = {
  title: string;
  description: string;
  source: ContentIngestionSource;
  sourceLabel: string | null;
  sections: ContentDraftSection[];
  structureAnalysis?: {
    mode: "DETERMINISTIC" | "AI_ASSISTED";
    confidence: number;
    aiUsed: boolean;
    message: string;
  } | null;
};

export type ContentPreviewRequest = {
  classroomId: string;
  source: ContentIngestionSource;
  title?: string;
  description?: string;
  templateKey?: string;
  content?: string;
  sourceUrl?: string;
  sourceLabel?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    let message = `Falha na preparação da jornada (${response.status}).`;
    try {
      const body = (await response.json()) as { message?: string; detail?: string };
      message = body.message || body.detail || message;
    } catch {
      // Preserve the HTTP fallback when the body is not JSON.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function fetchContentIngestionCapabilities() {
  return request<ContentIngestionCapabilities>("/api/content-ingestion/capabilities");
}

export function previewContentIngestion(input: ContentPreviewRequest) {
  return request<ContentDraft>("/api/content-ingestion/preview", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function previewContentFile(classroomId: string, file: File, title?: string) {
  const form = new FormData();
  form.append("classroomId", classroomId);
  if (title?.trim()) form.append("title", title.trim());
  form.append("file", file);

  const response = await apiFetch("/api/content-ingestion/file-preview", {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    let message = `Falha ao analisar o arquivo (${response.status}).`;
    try {
      const body = (await response.json()) as { message?: string; detail?: string };
      message = body.message || body.detail || message;
    } catch {
      // Preserve the HTTP fallback when the body is not JSON.
    }
    throw new Error(message);
  }
  return (await response.json()) as ContentDraft;
}

export function materializeContentDraft(classroomId: string, draft: ContentDraft) {
  return request<Journey>("/api/content-ingestion/materialize", {
    method: "POST",
    body: JSON.stringify({ classroomId, draft }),
  });
}
