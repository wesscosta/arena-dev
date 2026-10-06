import { apiRequest } from "./http/client";

export type LearningResourceFormat = "MARKDOWN" | "PLAIN_TEXT" | "LINK";
export type LearningResourceSourceType =
  | "MANUAL"
  | "AI"
  | "TEMPLATE"
  | "TEXT"
  | "MARKDOWN"
  | "FILE"
  | "URL"
  | "NOTION";

export type ContentOutlineNode = {
  level: number;
  title: string;
  anchor: string;
  sectionPath: string[];
  children: ContentOutlineNode[];
};

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
  sourceReference: string | null;
  sourceSnapshotAt: string | null;
  sourceContentSha256: string | null;
  subject: string | null;
  tags: string[];
  language: string | null;
  contentSha256: string | null;
  outlineParserVersion: string | null;
  outline: ContentOutlineNode[];
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
  subject?: string;
  tags?: string[];
  language?: string;
};

export type LibraryResourceInput = Omit<LearningResourceInput, "classroomId">;

export type LibrarySort = "RECENT" | "TITLE_ASC" | "TITLE_DESC";

export type LibraryFilters = {
  query?: string;
  archived?: boolean;
  subject?: string;
  tag?: string;
  language?: string;
  sort?: LibrarySort;
};

export type LibraryFacets = {
  subjects: string[];
  tags: string[];
  languages: string[];
};

export type LibraryJourneyUsage = {
  journeyId: string;
  journeyTitle: string;
  journeyStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  classroomId: string;
  classroomName: string;
  stageId: string;
  stageTitle: string;
  snapshotRevision: number | null;
  currentRevision: number;
  updateAvailable: boolean;
  refreshAllowed: boolean;
};

export type LibraryResourceUsage = {
  resourceId: string;
  currentRevision: number;
  journeys: LibraryJourneyUsage[];
};

export class LearningResourceApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "LearningResourceApiError";
  }
}

function learningResourceRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  return apiRequest<T>(path, init, {
    errorMessage: (status) => `Falha na API de conteúdos (${status}).`,
    errorFactory: (message, status) =>
      new LearningResourceApiError(message, status),
  });
}

export function fetchLearningResources(classroomId: string) {
  return learningResourceRequest<LearningResource[]>(
    `/api/learning-resources?classroomId=${encodeURIComponent(classroomId)}`,
  );
}

export function fetchLearningResource(id: string) {
  return learningResourceRequest<LearningResource>(
    `/api/learning-resources/${encodeURIComponent(id)}`,
  );
}

export function createLearningResource(input: LearningResourceInput) {
  return learningResourceRequest<LearningResource>("/api/learning-resources", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateLearningResource(
  id: string,
  input: LearningResourceInput,
) {
  return learningResourceRequest<LearningResource>(
    `/api/learning-resources/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export function deleteLearningResource(id: string) {
  return apiRequest<void>(
    `/api/learning-resources/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    {
      errorMessage: (status) => `Falha ao excluir conteúdo (${status}).`,
      errorFactory: (message, status) =>
        new LearningResourceApiError(message, status),
    },
  );
}

/**
 * Keeps the old (query, archived) call shape compatible while allowing the
 * semantic Library filters used by 16.5C/16.5D.
 */
export function fetchContentLibrary(
  queryOrFilters: string | LibraryFilters = "",
  archivedLegacy = false,
) {
  const filters: LibraryFilters =
    typeof queryOrFilters === "string"
      ? { query: queryOrFilters, archived: archivedLegacy }
      : queryOrFilters;
  const params = new URLSearchParams();
  if (filters.query?.trim()) params.set("q", filters.query.trim());
  if (filters.archived) params.set("archived", "true");
  if (filters.subject?.trim()) params.set("subject", filters.subject.trim());
  if (filters.tag?.trim()) params.set("tag", filters.tag.trim());
  if (filters.language?.trim())
    params.set("language", filters.language.trim());
  if (filters.sort && filters.sort !== "RECENT")
    params.set("sort", filters.sort);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return learningResourceRequest<LearningResource[]>(
    `/api/library/resources${suffix}`,
  );
}

export function fetchLibraryFacets() {
  return learningResourceRequest<LibraryFacets>("/api/library/resources/facets");
}

export function fetchLibraryResource(id: string) {
  return learningResourceRequest<LearningResource>(
    `/api/library/resources/${encodeURIComponent(id)}`,
  );
}

export function fetchLibraryResourceUsage(id: string) {
  return learningResourceRequest<LibraryResourceUsage>(
    `/api/library/resources/${encodeURIComponent(id)}/usage`,
  );
}

export function createLibraryResource(input: LibraryResourceInput) {
  return learningResourceRequest<LearningResource>("/api/library/resources", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateLibraryResource(
  id: string,
  input: LibraryResourceInput,
) {
  return learningResourceRequest<LearningResource>(
    `/api/library/resources/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export function archiveLibraryResource(id: string) {
  return apiRequest<void>(
    `/api/library/resources/${encodeURIComponent(id)}/archive`,
    { method: "POST" },
    {
      errorMessage: (status) => `Falha ao arquivar conteúdo (${status}).`,
      errorFactory: (message, status) =>
        new LearningResourceApiError(message, status),
    },
  );
}

export function restoreLibraryResource(id: string) {
  return learningResourceRequest<LearningResource>(
    `/api/library/resources/${encodeURIComponent(id)}/restore`,
    { method: "POST", body: "{}" },
  );
}
