import { apiRequest } from "./http/client";
import type {
  ContentOutlineNode,
  LearningResource,
  LearningResourceFormat,
  LearningResourceSourceType,
} from "./learning-resource-api";

export type LibraryIngestionSource =
  | "MARKDOWN"
  | "TEXT"
  | "FILE"
  | "NOTION"
  | "URL";

export type LibraryStructureAnalysis = {
  mode: "DETERMINISTIC" | "REFERENCE_ONLY";
  confidence: number;
  aiRecommended: boolean;
  message: string;
};

export type LibraryImportPreview = {
  title: string;
  summary: string | null;
  subject: string | null;
  tags: string[];
  language: string | null;
  body: string | null;
  format: LearningResourceFormat;
  sourceType: LearningResourceSourceType;
  sourceUrl: string | null;
  sourceLabel: string | null;
  sourceReference: string | null;
  sourceContentSha256: string;
  parserVersion: string;
  outline: ContentOutlineNode[];
  structureAnalysis: LibraryStructureAnalysis;
};

export type LibraryImportRequest = {
  source: LibraryIngestionSource;
  title?: string;
  summary?: string;
  subject?: string;
  tags?: string[];
  language?: string;
  content?: string;
  sourceUrl?: string;
  sourceLabel?: string;
};

export type LibraryIngestionCapabilities = {
  sources: string[];
  fileExtensions: string[];
  notionConfigured: boolean;
};

export function fetchLibraryIngestionCapabilities() {
  return apiRequest<LibraryIngestionCapabilities>(
    "/api/library/ingestion/capabilities",
  );
}

export function previewLibraryImport(input: LibraryImportRequest) {
  return apiRequest<LibraryImportPreview>("/api/library/ingestion/preview", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function previewLibraryFile(
  file: File,
  metadata: {
    title?: string;
    summary?: string;
    subject?: string;
    tags?: string[];
    language?: string;
  } = {},
) {
  const form = new FormData();
  form.set("file", file);
  if (metadata.title?.trim()) form.set("title", metadata.title.trim());
  if (metadata.summary?.trim()) form.set("summary", metadata.summary.trim());
  if (metadata.subject?.trim()) form.set("subject", metadata.subject.trim());
  if (metadata.language?.trim()) form.set("language", metadata.language.trim());
  for (const tag of metadata.tags ?? []) {
    if (tag.trim()) form.append("tags", tag.trim());
  }
  return apiRequest<LibraryImportPreview>(
    "/api/library/ingestion/file-preview",
    { method: "POST", body: form },
    {
      errorMessage: (status) =>
        `Não foi possível analisar o arquivo (${status}).`,
    },
  );
}

export function materializeLibraryImport(
  preview: LibraryImportPreview,
  overrides: {
    title?: string;
    summary?: string;
    subject?: string;
    tags?: string[];
    language?: string;
    body?: string;
  } = {},
) {
  return apiRequest<LearningResource>("/api/library/ingestion/materialize", {
    method: "POST",
    body: JSON.stringify({
      title: overrides.title ?? preview.title,
      summary: overrides.summary ?? preview.summary,
      body: overrides.body ?? preview.body,
      format: preview.format,
      sourceType: preview.sourceType,
      sourceUrl: preview.sourceUrl,
      sourceLabel: preview.sourceLabel,
      sourceReference: preview.sourceReference,
      sourceSnapshotAt: new Date().toISOString(),
      sourceContentSha256: preview.sourceContentSha256,
      subject: overrides.subject ?? preview.subject,
      tags: overrides.tags ?? preview.tags,
      language: overrides.language ?? preview.language,
    }),
  });
}
