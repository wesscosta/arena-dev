import { apiRequest } from "./http/client";
import type { ContentOutlineNode } from "./learning-resource-api";

export type MaterialPublication = {
  id: string;
  sessionId: string;
  resourceId: string;
  resourceRevision: number;
  title: string;
  status: "ACTIVE" | "REVOKED";
  requestId: string;
  expectedStageVersion: number;
  publishedStageVersion: number;
  withdrawRequestId: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export type PublicPresentedMaterial = {
  publicationId: string;
  title: string;
  revision: number;
  format: "MARKDOWN" | "PLAIN_TEXT";
  body: string;
  outline: ContentOutlineNode[];
  parserVersion: string;
  contentHash: string;
  stageVersion: number;
};

const sessionPath = (sessionId: string) =>
  `/api/sessions/${encodeURIComponent(sessionId)}/material-presentation`;

export function getMaterialPresentation(sessionId: string) {
  return apiRequest<MaterialPublication | null>(sessionPath(sessionId), { cache: "no-store" });
}

export function publishMaterial(sessionId: string, resourceId: string, expectedVersion: number, requestId: string) {
  return apiRequest<MaterialPublication>(sessionPath(sessionId), {
    method: "POST",
    body: JSON.stringify({ resourceId, expectedVersion, requestId }),
  });
}

export function withdrawMaterial(sessionId: string, publicationId: string, expectedVersion: number, requestId: string) {
  return apiRequest<MaterialPublication>(sessionPath(sessionId), {
    method: "DELETE",
    body: JSON.stringify({ publicationId, expectedVersion, requestId }),
  });
}

/** Code-based, read-only, no credentials or browser cache. Never use Library APIs in projector. */
export function fetchPublicPresentedMaterial(code: string, signal?: AbortSignal) {
  return apiRequest<PublicPresentedMaterial>(
    `/api/projector/${encodeURIComponent(code)}/material`,
    { cache: "no-store", signal },
    { credentials: "omit", errorMessage: "O material não está disponível nesta sessão." },
  );
}

/** UUID v4 via getRandomValues also on self-hosted HTTP LAN (randomUUID needs secure context). */
export function materialRequestId() {
  const value = new Uint8Array(16);
  crypto.getRandomValues(value);
  value[6] = (value[6] & 0x0f) | 0x40;
  value[8] = (value[8] & 0x3f) | 0x80;
  const hex = Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}
