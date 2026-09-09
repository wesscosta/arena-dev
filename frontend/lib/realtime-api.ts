import { apiFetch, browserApiBaseUrl } from "./auth-api";
import { normalizeJoinCode } from "./app-state";

export type JoinCode = {
  code: string;
  expiresAt: string;
};

export type PublicSession = {
  sessionId: string;
  classroomId: string;
  classroomName: string;
  sessionTitle: string;
  code: string;
  expiresAt: string;
};

export type DeviceRecognition = {
  displayName: string;
  expiresAt: string;
};

export type StudentJoinAccess = {
  token: string;
  code: string;
  sessionId: string;
  classroomName: string;
  sessionTitle: string;
  participantId: string;
  studentId: string;
  registration?: string | null;
  name: string;
  nickname?: string | null;
  displayName: string;
  present: boolean;
  expiresAt: string;
};

export type StudentJoinResult = {
  access: StudentJoinAccess;
  deviceToken?: string | null;
  deviceExpiresAt?: string | null;
};

export type BuzzerPress = {
  id: string;
  participantId: string;
  studentId: string;
  name: string;
  nickname?: string | null;
  displayName: string;
  position: number;
  receivedAt: string;
};

export type BuzzerState = {
  status: "IDLE" | "OPEN" | "CLOSED";
  roundId?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
  presses: BuzzerPress[];
};

export type SessionRealtimeEvent = {
  type: "RUNTIME_SNAPSHOT" | "LIVE_STAGE_STATE" | "BUZZER_STATE" | "BUZZER_PARTICIPANT_STATE" | "BOSS_STATE" | "TIMER_STATE" | "WORD_CLOUD_STATE" | "WORD_CLOUD_PARTICIPANT_STATE" | "POLL_STATE" | "POLL_PARTICIPANT_STATE" | "PARTICIPANT_CONNECTED" | "PARTICIPANT_DISCONNECTED" | "SESSION_FINISHED" | "AUTH_OK" | "AUTH_REQUIRED" | "AUTH_FAILED" | "ERROR" | string;
  sessionId: string;
  occurredAt: string;
  payload: unknown;
};

type ApiErrorBody = { message?: string };

export class RealtimeApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "RealtimeApiError";
  }
}

async function request<T>(path: string, init?: RequestInit, credentials: RequestCredentials = "include"): Promise<T> {
  const response = await apiFetch(path, init, credentials);
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try { body = (await response.json()) as ApiErrorBody; } catch { body = undefined; }
    throw new RealtimeApiError(body?.message || `Falha na API em tempo real (${response.status}).`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function fetchJoinCode(sessionId: string) {
  return request<JoinCode>(`/api/sessions/${sessionId}/join-code`);
}

export function rotateJoinCode(sessionId: string) {
  return request<JoinCode>(`/api/sessions/${sessionId}/join-code/rotate`, { method: "POST" });
}

export function fetchPublicSession(code: string) {
  return request<PublicSession>(`/api/join/${encodeURIComponent(normalizeJoinCode(code))}`, undefined, "omit");
}

export function joinSession(code: string, identity: string, rememberDevice = true) {
  return request<StudentJoinResult>(`/api/join/${encodeURIComponent(normalizeJoinCode(code))}`, {
    method: "POST",
    body: JSON.stringify({ identity, rememberDevice }),
  }, "omit");
}

export function recognizeRememberedDevice(code: string, deviceToken: string) {
  return request<DeviceRecognition>(`/api/join/${encodeURIComponent(normalizeJoinCode(code))}/device/recognize`, {
    method: "POST",
    body: JSON.stringify({ deviceToken }),
  }, "omit");
}

export function joinRememberedDevice(code: string, deviceToken: string) {
  return request<StudentJoinAccess>(`/api/join/${encodeURIComponent(normalizeJoinCode(code))}/device`, {
    method: "POST",
    body: JSON.stringify({ deviceToken }),
  }, "omit");
}

export function revokeRememberedDevice(deviceToken: string) {
  return request<void>("/api/join/device/revoke", {
    method: "POST",
    body: JSON.stringify({ deviceToken }),
  }, "omit");
}

export function fetchBuzzerState(sessionId: string) {
  return request<BuzzerState>(`/api/sessions/${sessionId}/buzzer`);
}

export function openBuzzer(sessionId: string) {
  return request<BuzzerState>(`/api/sessions/${sessionId}/buzzer/open`, { method: "POST" });
}

export function closeBuzzer(sessionId: string) {
  return request<BuzzerState>(`/api/sessions/${sessionId}/buzzer/close`, { method: "POST" });
}

export function joinQrImageUrl(sessionId: string, baseUrl: string, code: string, size = 280) {
  const params = new URLSearchParams({ baseUrl, size: String(size), v: code });
  return `${browserApiBaseUrl()}/api/sessions/${sessionId}/join-code/qr?${params.toString()}`;
}

export function sessionSocketUrl(sessionId: string) {
  const api = new URL(browserApiBaseUrl());
  api.protocol = api.protocol === "https:" ? "wss:" : "ws:";
  api.pathname = `/ws/sessions/${sessionId}`;
  api.search = "";
  return api.toString();
}

export function connectSessionSocket(
  sessionId: string,
  onEvent: (event: SessionRealtimeEvent) => void,
  participantToken?: string,
) {
  const socket = new WebSocket(sessionSocketUrl(sessionId));
  let heartbeat: number | undefined;
  socket.addEventListener("open", () => {
    if (participantToken) socket.send(JSON.stringify({ type: "AUTH_PARTICIPANT", token: participantToken }));
    heartbeat = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "PING" }));
    }, 25000);
  });
  socket.onmessage = (message) => {
    try {
      onEvent(JSON.parse(String(message.data)) as SessionRealtimeEvent);
    } catch {
      // Ignora mensagens que não pertencem ao contrato do Arena Dev.
    }
  };
  socket.addEventListener("close", () => { if (heartbeat) window.clearInterval(heartbeat); });
  return socket;
}
