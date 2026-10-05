import { apiRequest } from "./http/client";
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

function contentIngestionRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init, {
    errorMessage: (status) => `Falha na preparação da jornada (${status}).`,
  });
}

export function fetchContentIngestionCapabilities() {
  return contentIngestionRequest<ContentIngestionCapabilities>("/api/content-ingestion/capabilities");
}

export function previewContentIngestion(input: ContentPreviewRequest) {
  return contentIngestionRequest<ContentDraft>("/api/content-ingestion/preview", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function previewContentFile(classroomId: string, file: File, title?: string) {
  const form = new FormData();
  form.append("classroomId", classroomId);
  if (title?.trim()) form.append("title", title.trim());
  form.append("file", file);

  return apiRequest<ContentDraft>(
    "/api/content-ingestion/file-preview",
    {
      method: "POST",
      body: form,
    },
    {
      errorMessage: (status) => `Falha ao analisar o arquivo (${status}).`,
    },
  );
}

export function materializeContentDraft(classroomId: string, draft: ContentDraft) {
  return contentIngestionRequest<Journey>("/api/content-ingestion/materialize", {
    method: "POST",
    body: JSON.stringify({ classroomId, draft }),
  });
}
