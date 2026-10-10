import { apiRequest } from "./http/client";

export type ClinicOption = { key: string; label: string; count: number; incorrect: boolean };
export type ClinicNote = { id: string; optionKey: string; note: string; createdAt: string };
export type ErrorClinicView = {
  runId: string;
  responseCount: number;
  options: ClinicOption[];
  notes: ClinicNote[];
  disclaimer: string;
};

const url = (sessionId: string, runId: string) =>
  `/api/sessions/${sessionId}/learning-checks/${runId}/error-clinic`;

export function fetchErrorClinic(sessionId: string, runId: string) {
  return apiRequest<ErrorClinicView>(url(sessionId, runId));
}

export function annotateErrorClinic(sessionId: string, runId: string,
  commandId: string, optionKey: string, note: string) {
  return apiRequest<ErrorClinicView>(`${url(sessionId, runId)}/notes`, {
    method: "POST",
    body: JSON.stringify({ commandId, optionKey, note }),
  });
}
