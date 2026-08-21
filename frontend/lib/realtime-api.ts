export type JoinCode = {
  code: string;
  expiresAt: string;
};

export type PublicSession = {
  sessionId: string;
  classroomName: string;
  sessionTitle: string;
  code: string;
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
  present: boolean;
  expiresAt: string;
};

export type BuzzerPress = {
  id: string;
  participantId: string;
  studentId: string;
  name: string;
  nickname?: string | null;
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
  type: "BUZZER_STATE" | "PARTICIPANT_CONNECTED" | "PARTICIPANT_DISCONNECTED" | "SESSION_FINISHED" | "ERROR" | string;
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

const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export function browserApiBaseUrl() {
  if (CONFIGURED_API_URL) {
    if (typeof window !== "undefined") {
      try {
        const configured = new URL(CONFIGURED_API_URL);
        const configuredIsLocal = configured.hostname === "localhost" || configured.hostname === "127.0.0.1";
        const browserIsRemote = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
        if (configuredIsLocal && browserIsRemote) {
          configured.hostname = window.location.hostname;
          return configured.toString().replace(/\/$/, "");
        }
      } catch {
        // Usa o valor configurado abaixo.
      }
    }
    return CONFIGURED_API_URL;
  }
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "http://localhost:8080";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${browserApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
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
  return request<PublicSession>(`/api/join/${encodeURIComponent(code.trim())}`);
}

export function joinSession(code: string, identity: string) {
  return request<StudentJoinAccess>(`/api/join/${encodeURIComponent(code.trim())}`, {
    method: "POST",
    body: JSON.stringify({ identity }),
  });
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

export function sessionSocketUrl(sessionId: string, participantToken?: string) {
  const api = new URL(browserApiBaseUrl());
  api.protocol = api.protocol === "https:" ? "wss:" : "ws:";
  api.pathname = `/ws/sessions/${sessionId}`;
  api.search = participantToken ? new URLSearchParams({ token: participantToken }).toString() : "";
  return api.toString();
}

export function connectSessionSocket(
  sessionId: string,
  onEvent: (event: SessionRealtimeEvent) => void,
  participantToken?: string,
) {
  const socket = new WebSocket(sessionSocketUrl(sessionId, participantToken));
  socket.onmessage = (message) => {
    try {
      onEvent(JSON.parse(String(message.data)) as SessionRealtimeEvent);
    } catch {
      // Ignora mensagens que não pertencem ao contrato do Arena Dev.
    }
  };
  return socket;
}
