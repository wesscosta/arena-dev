import type { ScoreEvent, Student } from "./types";
import type { ExternalResultPlatform, ParsedExternalResultRow } from "./external-results";
import { apiFetch } from "./auth-api";


type ApiErrorBody = { message?: string; fields?: Record<string, string> };

export class ExternalResultsApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ExternalResultsApiError";
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
    throw new ExternalResultsApiError(body?.message || `Falha ao processar relatório externo (${response.status}).`, response.status);
  }
  return (await response.json()) as T;
}

export type ExternalResultRowInput = ParsedExternalResultRow & { studentId?: string };

export type ExternalResultRequest = {
  platform?: ExternalResultPlatform | string;
  sourceName?: string;
  fallbackMaxScore?: number;
  rows: ExternalResultRowInput[];
};

export type ExternalResultPreviewRow = {
  rowIndex: number;
  participantName?: string;
  participantRegistration?: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  studentId?: string;
  studentName?: string;
  xpAwarded: number;
  status: "MATCHED" | "UNMATCHED" | "DUPLICATE" | "SCORE_UNRESOLVED";
  note?: string;
};

export type ExternalResultPreview = {
  activityId: string;
  activityTitle: string;
  activityPoints: number;
  platform?: string;
  sourceName?: string;
  rowCount: number;
  matchedCount: number;
  unresolvedCount: number;
  duplicateStudentCount: number;
  scoreIssueCount: number;
  duplicateImport: boolean;
  fingerprint: string;
  rows: ExternalResultPreviewRow[];
};

type ScoreEventView = {
  id: string;
  classroomId: string;
  studentId: string;
  sessionId: string | null;
  points: number;
  category: ScoreEvent["category"];
  description: string;
  source: ScoreEvent["source"];
  activityId: string | null;
  questionId: string | null;
  createdAt: string;
  reversalOf: string | null;
  reversed: boolean;
};

export type ExternalResultImportResult = {
  importId: string;
  activityId: string;
  classroomId: string;
  platform?: string;
  sourceName?: string;
  rowCount: number;
  matchedCount: number;
  importedCount: number;
  createdAt: string;
  scoreEvents: ScoreEventView[];
};

export type ExternalResultImportSummary = {
  id: string;
  platform?: string;
  sourceName?: string;
  rowCount: number;
  matchedCount: number;
  importedCount: number;
  createdAt: string;
};

export async function previewExternalResults(activityId: string, input: ExternalResultRequest) {
  return request<ExternalResultPreview>(`/api/activities/${activityId}/external-results/preview`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function importExternalResults(activityId: string, input: ExternalResultRequest) {
  return request<ExternalResultImportResult>(`/api/activities/${activityId}/external-results/import`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchExternalResultImports(activityId: string) {
  return request<ExternalResultImportSummary[]>(`/api/activities/${activityId}/external-results/imports`);
}

export function mapImportedScoreEvents(rows: ExternalResultImportResult["scoreEvents"]): ScoreEvent[] {
  return rows.map((row) => ({
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
  }));
}

export function applyStudentOverrides(rows: ExternalResultRowInput[], overrides: Record<number, string>, students: Student[]) {
  const allowed = new Set(students.map((student) => student.id));
  return rows.map((row) => ({
    ...row,
    studentId: overrides[row.rowIndex] && allowed.has(overrides[row.rowIndex]) ? overrides[row.rowIndex] : row.studentId,
  }));
}
