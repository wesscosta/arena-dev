export type TeacherSession = {
  username: string;
  role: "TEACHER";
};

type ApiErrorBody = { message?: string };

const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
let csrfTokenPromise: Promise<string> | undefined;

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
        // Mantém a URL configurada.
      }
    }
    return CONFIGURED_API_URL;
  }
  if (typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:8080`;
  return "http://localhost:8080";
}

function requiresCsrf(method?: string) {
  return !["GET", "HEAD", "OPTIONS", "TRACE"].includes((method ?? "GET").toUpperCase());
}

async function csrfToken() {
  csrfTokenPromise ??= fetch(`${browserApiBaseUrl()}/api/auth/csrf`, { credentials: "include" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Falha ao preparar proteção CSRF (${response.status}).`);
      return ((await response.json()) as { token: string }).token;
    })
    .catch((error) => {
      csrfTokenPromise = undefined;
      throw error;
    });
  return csrfTokenPromise;
}

export async function apiFetch(path: string, init?: RequestInit, credentials: RequestCredentials = "include") {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (credentials === "include" && requiresCsrf(init?.method)) {
    headers.set("X-XSRF-TOKEN", await csrfToken());
  }

  const response = await fetch(`${browserApiBaseUrl()}${path}`, {
    ...init,
    credentials,
    headers,
  });
  if (response.status === 401 && credentials === "include" && typeof window !== "undefined") {
    window.dispatchEvent(new Event("arena-auth-required"));
  }
  if (response.status === 403 && requiresCsrf(init?.method)) csrfTokenPromise = undefined;
  return response;
}

async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try { body = (await response.json()) as ApiErrorBody; } catch { body = undefined; }
    throw new Error(body?.message || (response.status === 401 ? "Usuário ou senha inválidos." : `Falha de autenticação (${response.status}).`));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function fetchTeacherSession(): Promise<TeacherSession | null> {
  const response = await apiFetch("/api/auth/session");
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Falha ao verificar sessão do professor (${response.status}).`);
  return (await response.json()) as TeacherSession;
}

export function loginTeacher(username: string, password: string) {
  return authRequest<TeacherSession>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logoutTeacher() {
  return authRequest<void>("/api/auth/logout", { method: "POST" });
}
