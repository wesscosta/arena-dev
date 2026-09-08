import { apiFetch, browserApiBaseUrl } from "./auth-api";
import { normalizeJoinCode } from "./app-state";
import type { SessionRealtimeEvent } from "./realtime-api";
import type { SessionTimer } from "./timer-api";
import type { LiveStageState } from "./live-stage-api";
import type { PollState } from "./poll-api";

export type ProjectorSnapshot = {
  sessionId: string;
  classroomName: string;
  sessionTitle: string;
  code: string;
  expiresAt: string;
  serverTime: string;
  timer: SessionTimer | null;
  stage: LiveStageState;
  poll: PollState;
};

type ApiErrorBody = { message?: string };

export class ProjectorApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ProjectorApiError";
  }
}

export async function fetchProjectorSnapshot(code: string): Promise<ProjectorSnapshot> {
  const normalized = normalizeJoinCode(code);
  const response = await apiFetch(
    `/api/projector/${encodeURIComponent(normalized)}`,
    undefined,
    "omit",
  );

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new ProjectorApiError(
      body?.message || "Código de sessão inválido, expirado ou encerrado.",
      response.status,
    );
  }

  return (await response.json()) as ProjectorSnapshot;
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
  let heartbeat: number | undefined;

  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({
      type: "AUTH_PROJECTOR",
      code: normalizeJoinCode(code),
    }));
    heartbeat = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "PING" }));
      }
    }, 25000);
  });

  socket.onmessage = (message) => {
    try {
      onEvent(JSON.parse(String(message.data)) as SessionRealtimeEvent);
    } catch {
      // Ignora frames que não pertencem ao contrato do Arena Dev.
    }
  };

  socket.addEventListener("close", () => {
    if (heartbeat) window.clearInterval(heartbeat);
  });

  return socket;
}
