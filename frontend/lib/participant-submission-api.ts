import { apiRequest } from "./http/client";

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
  publishedFeedback: string | null;
  feedbackPublishedAt: string | null;
  timeLimitMinutes: number | null;
  deadlineAt: string | null;
  /** Timestamp do backend para calibrar a contagem; relógio do browser é apenas visual. */
  serverNow: string;
};


function participantActivityRequest<T>(
  code: string,
  token: string,
  path = "",
  init?: RequestInit,
): Promise<T> {
  return apiRequest<T>(
    `/api/join/${encodeURIComponent(code)}/activities${path}`,
    {
      ...init,
      headers: {
        "X-Participant-Token": token,
        ...init?.headers,
      },
    },
    {
      credentials: "omit",
      errorMessage: (status) => `Falha ao acessar atividades (${status}).`,
    },
  );
}

export function fetchParticipantActivities(code: string, token: string) {
  return participantActivityRequest<ParticipantActivity[]>(code, token);
}

export function startParticipantActivity(code: string, token: string, activityId: string) {
  return participantActivityRequest<ParticipantActivity>(code, token, `/${activityId}/start`, { method: "POST" });
}

export function saveParticipantSubmissionItem(
  code: string,
  token: string,
  activityId: string,
  submissionId: string,
  itemId: string,
  input: { kind: ParticipantSubmissionKind; questionId?: string | null; position: number; content: unknown },
) {
  return participantActivityRequest<ParticipantActivity>(
    code,
    token,
    `/${activityId}/submissions/${submissionId}/items/${itemId}`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}


export function recordParticipantPaste(
  code: string,
  token: string,
  activityId: string,
  submissionId: string,
  itemId: string | null,
  characterCount: number,
) {
  return apiRequest<void>(
    `/api/join/${encodeURIComponent(code)}/activities/${activityId}/submissions/${submissionId}/evidence/paste`,
    {
      method: "POST",
      headers: { "X-Participant-Token": token },
      body: JSON.stringify({ itemId, characterCount }),
    },
    {
      credentials: "omit",
      errorMessage: (status) => `Falha ao registrar evento de processo (${status}).`,
    },
  );
}

export function submitParticipantActivity(code: string, token: string, activityId: string, submissionId: string) {
  return participantActivityRequest<ParticipantActivity>(
    code,
    token,
    `/${activityId}/submissions/${submissionId}/submit`,
    { method: "POST" },
  );
}
