import { attachHeartbeat } from "./realtime-heartbeat";
import { browserApiBaseUrl } from "./auth-api";
import { apiRequest } from "./http/client";
import { normalizeJoinCode } from "./app-state";
import type { SessionRealtimeEvent } from "./realtime-api";
import type { PublicRuntimeSnapshot } from "./runtime-snapshot";

export type ProjectorSnapshot = {
  sessionId: string;
  classroomName: string;
  sessionTitle: string;
  code: string;
  expiresAt: string;
  serverTime: string;
  runtime: PublicRuntimeSnapshot;
};


export class ProjectorApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ProjectorApiError";
  }
}

export function fetchProjectorSnapshot(code: string): Promise<ProjectorSnapshot> {
  const normalized = normalizeJoinCode(code);
  return apiRequest<ProjectorSnapshot>(
    `/api/projector/${encodeURIComponent(normalized)}`,
    undefined,
    {
      credentials: "omit",
      errorMessage: "Código de sessão inválido, expirado ou encerrado.",
      errorFactory: (message, status) => new ProjectorApiError(message, status),
    },
  );
}

/** Join QR for the projector footer; public like the projector snapshot. */
export function projectorQrImageUrl(code: string, baseUrl: string) {
  const params = new URLSearchParams({ baseUrl });
  return `${browserApiBaseUrl()}/api/projector/${encodeURIComponent(normalizeJoinCode(code))}/qr?${params.toString()}`;
}

export function projectorSocketUrl(sessionId: string) {
  const api = new URL(browserApiBaseUrl());
  api.protocol = api.protocol === "https:" ? "wss:" : "ws:";
  api.pathname = `/ws/projector/${sessionId}`;
  api.search = "";
  return api.toString();
}

export function connectProjectorSocket(
  sessionId: string,
  code: string,
  onEvent: (event: SessionRealtimeEvent) => void,
) {
  const socket = new WebSocket(projectorSocketUrl(sessionId));

  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({
      type: "AUTH_PROJECTOR",
      code: normalizeJoinCode(code),
    }));
  });
  attachHeartbeat(socket);

  socket.onmessage = (message) => {
    try {
      onEvent(JSON.parse(String(message.data)) as SessionRealtimeEvent);
    } catch {
      // Ignora frames que não pertencem ao contrato do Arena Dev.
    }
  };

  return socket;
}
