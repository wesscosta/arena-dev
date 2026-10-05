export type TeacherSession = {
  username: string;
  role: "TEACHER";
};

type ApiErrorBody = { message?: string };

const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
let csrfTokenPromise: Promise<string> | undefined;

function isLoopbackHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  return normalized === "localhost"
    || normalized === "127.0.0.1"
    || normalized === "::1"
    || normalized === "0.0.0.0";
}

export function resolveBrowserApiBaseUrl(configuredApiUrl?: string, browserOrigin?: string) {
  const configured = configuredApiUrl?.replace(/\/$/, "");

  if (browserOrigin) {
    const origin = browserOrigin.replace(/\/$/, "");
    if (!configured) return origin;

    try {
      const configuredUrl = new URL(configured);
      if (isLoopbackHostname(configuredUrl.hostname)) {
        return origin;
      }
    } catch {
      // URL inválida: mantém o valor configurado para expor o erro de configuração.
    }
  }

  return configured || "http://localhost:8080";
}

export function browserApiBaseUrl() {
  return resolveBrowserApiBaseUrl(
    CONFIGURED_API_URL,
    typeof window !== "undefined" ? window.location.origin : undefined,
  );
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
  const multipart = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!multipart && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
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
