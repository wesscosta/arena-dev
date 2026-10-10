import { apiRequest } from "./http/client";

export type ArenaContextMaterial = {
  resourceId: string;
  title: string;
  revision: number;
  available: boolean;
};

const path = (sessionId: string) =>
  `/api/sessions/${encodeURIComponent(sessionId)}/contextual-material`;

export function fetchArenaContextMaterial(sessionId: string) {
  return apiRequest<ArenaContextMaterial | null>(path(sessionId));
}
export function linkArenaContextMaterial(sessionId: string, resourceId: string) {
  return apiRequest<ArenaContextMaterial>(path(sessionId), {
    method: "PUT", body: JSON.stringify({ resourceId }),
  });
}
export function unlinkArenaContextMaterial(sessionId: string) {
  return apiRequest<void>(path(sessionId), { method: "DELETE" });
}
