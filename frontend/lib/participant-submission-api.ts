import { apiFetch } from "./auth-api";

export type ParticipantSubmissionKind = "QUESTION_RESPONSE" | "TEXT" | "LINK" | "CODE" | "FILE" | "ARTIFACT";

export type ParticipantQuestion = {
  id: string;
  type: string;
  statement: string;
  points: number;
  position: number;
  options: unknown;
  code: string | null;
  language: string | null;
};

export type ParticipantSubmissionItem = {
  id: string;
  kind: ParticipantSubmissionKind;
  questionId: string | null;
  position: number;
  content: unknown;
  updatedAt: string;
};

export type ParticipantActivity = {
  id: string;
  title: string;
  topic: string | null;
  points: number;
  onTimeBonus: number;
  questions: ParticipantQuestion[];
  submissionId: string | null;
  submissionStatus: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "UNDER_REVIEW" | "GRADED" | "RETURNED";
  startedAt: string | null;
  submittedAt: string | null;
  items: ParticipantSubmissionItem[];
};

type ApiErrorBody = { message?: string };

async function request<T>(code: string, token: string, path = "", init?: RequestInit): Promise<T> {
  const response = await apiFetch(`/api/join/${encodeURIComponent(code)}/activities${path}`, {
    ...init,
    headers: {
      "X-Participant-Token": token,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  }, "omit");
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try { body = (await response.json()) as ApiErrorBody; } catch { body = undefined; }
    throw new Error(body?.message || `Falha ao acessar atividades (${response.status}).`);
  }
  return (await response.json()) as T;
}

export function fetchParticipantActivities(code: string, token: string) {
  return request<ParticipantActivity[]>(code, token);
}

export function startParticipantActivity(code: string, token: string, activityId: string) {
  return request<ParticipantActivity>(code, token, `/${activityId}/start`, { method: "POST" });
}

export function saveParticipantSubmissionItem(
  code: string,
  token: string,
  activityId: string,
  submissionId: string,
  itemId: string,
  input: { kind: ParticipantSubmissionKind; questionId?: string | null; position: number; content: unknown },
) {
  return request<ParticipantActivity>(
    code,
    token,
    `/${activityId}/submissions/${submissionId}/items/${itemId}`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export function submitParticipantActivity(code: string, token: string, activityId: string, submissionId: string) {
  return request<ParticipantActivity>(
    code,
    token,
    `/${activityId}/submissions/${submissionId}/submit`,
    { method: "POST" },
  );
}
