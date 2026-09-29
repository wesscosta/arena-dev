import { browserApiBaseUrl } from "./auth-api";

export type StudyState = "COMPLETED" | "CURRENT" | "LOCKED";
export type JourneyProgressSummary = { completedContents: number; totalContents: number; percent: number };
export type JourneyStudySummary = {
  id: string;
  title: string;
  description: string | null;
  progress: JourneyProgressSummary;
  currentContentId: string | null;
  currentContentTitle: string | null;
  started: boolean;
  lastStudiedAt: string | null;
  classroomId?: string;
  classroomName?: string;
  classroomCode?: string | null;
};
export type JourneyContentView = {
  id: string;
  title: string;
  description: string | null;
  state: StudyState;
  resourceId: string | null;
  hasExternalSource: boolean;
};
export type JourneyModuleView = { id: string | null; title: string; description: string | null; contents: JourneyContentView[] };
export type AchievementCode = "FIRST_CONTENT_COMPLETED" | "FIRST_MODULE_COMPLETED" | "FIRST_JOURNEY_COMPLETED";
export type AchievementView = { code: AchievementCode; title: string; description: string; unlocked: boolean; unlockedAt: string | null };
export type AchievementSummary = { unlocked: number; total: number; items: AchievementView[] };

export type JourneyStudyView = {
  id: string;
  title: string;
  description: string | null;
  progress: JourneyProgressSummary;
  modules: JourneyModuleView[];
  newlyUnlockedAchievements: AchievementView[];
};
export type JourneyContentDetailView = JourneyContentView & {
  body: string | null;
  format: string | null;
  sourceUrl: string | null;
  sourceLabel: string | null;
};

export class StudyApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = "StudyApiError"; }
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${browserApiBaseUrl()}${path}`, {
    ...init,
    credentials: "omit",
    headers: { "Content-Type": "application/json", "X-Study-Token": token, ...init?.headers },
  });
  if (!response.ok) {
    let message = `Falha ao carregar estudos (${response.status}).`;
    try { message = ((await response.json()) as { message?: string }).message || message; } catch { /* response without JSON */ }
    throw new StudyApiError(message, response.status);
  }
  return (await response.json()) as T;
}

export type LiveSessionSummary = {
  sessionId: string;
  classroomId: string;
  classroomName: string;
  sessionTitle: string;
  joinCode: string;
  startedAt: string;
};

export function fetchStudyAchievements(token: string) {
  return request<AchievementSummary>("/api/learn/achievements", token);
}
export async function fetchAllStudyAchievements(): Promise<AchievementSummary> {
  for (const claim of studyDeviceClaims()) {
    try { return await fetchStudyAchievements(claim.token); } catch { /* try another valid device claim */ }
  }
  throw new StudyApiError("Não foi possível carregar suas conquistas.", 401);
}

export function fetchStudyLiveSessions(token: string) {
  return request<LiveSessionSummary[]>("/api/learn/live", token);
}
export type JourneyRedemptionResult = { journeyId: string; title: string; description: string | null; alreadyAdded: boolean };

export async function redeemJourneyCode(code: string): Promise<JourneyRedemptionResult> {
  const claims = studyDeviceClaims();
  if (!claims.length) throw new StudyApiError("Entre em uma aula ao vivo primeiro para criar seu perfil neste dispositivo.", 401);
  let lastError: unknown;
  for (const claim of claims) {
    try {
      return await request<JourneyRedemptionResult>("/api/learn/journeys/redeem", claim.token, {
        method: "POST", body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
    } catch (error) { lastError = error; }
  }
  throw lastError instanceof Error ? lastError : new StudyApiError("Não foi possível adicionar a Jornada.", 400);
}

export function fetchStudyJourneys(token: string) { return request<JourneyStudySummary[]>("/api/learn/journeys", token); }
export function fetchStudyJourney(id: string, token: string) { return request<JourneyStudyView>(`/api/learn/journeys/${encodeURIComponent(id)}`, token); }
export function fetchStudyContent(journeyId: string, contentId: string, token: string) {
  return request<JourneyContentDetailView>(`/api/learn/journeys/${encodeURIComponent(journeyId)}/contents/${encodeURIComponent(contentId)}`, token);
}
export function startStudyContent(journeyId: string, contentId: string, token: string) {
  return request<JourneyStudyView>(`/api/learn/journeys/${encodeURIComponent(journeyId)}/contents/${encodeURIComponent(contentId)}/start`, token, { method: "POST", body: "{}" });
}
export function completeStudyContent(journeyId: string, contentId: string, token: string) {
  return request<JourneyStudyView>(`/api/learn/journeys/${encodeURIComponent(journeyId)}/contents/${encodeURIComponent(contentId)}/complete`, token, { method: "POST", body: "{}" });
}

export function studyDeviceClaims(): Array<{ classroomId: string; token: string }> {
  if (typeof window === "undefined") return [];
  const prefix = "arena-dev-device:";
  const result: Array<{ classroomId: string; token: string }> = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;
    const token = window.localStorage.getItem(key);
    if (token) result.push({ classroomId: key.slice(prefix.length), token });
  }
  return result;
}

export async function fetchAllStudyLiveSessions(): Promise<LiveSessionSummary[]> {
  const claims = studyDeviceClaims();
  const groups = await Promise.all(claims.map(async (claim) => {
    try { return await fetchStudyLiveSessions(claim.token); } catch { return []; }
  }));
  const unique = new Map<string, LiveSessionSummary>();
  groups.flat().forEach((session) => unique.set(session.sessionId, session));
  return [...unique.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export type MultiClassroomJourneySummary = JourneyStudySummary & { studyToken: string; classroomId: string };
export async function fetchAllStudyJourneys(): Promise<MultiClassroomJourneySummary[]> {
  const claims = studyDeviceClaims();
  const groups = await Promise.all(claims.map(async (claim) => {
    try { const journeys = await fetchStudyJourneys(claim.token); return journeys.map((journey) => ({ ...journey, studyToken: claim.token, classroomId: journey.classroomId ?? claim.classroomId })); }
    catch { return []; }
  }));
  const unique = new Map<string, MultiClassroomJourneySummary>();
  groups.flat().forEach((journey) => unique.set(`${journey.classroomId}:${journey.id}`, journey));
  return [...unique.values()].sort((a,b) => (b.lastStudiedAt ?? "").localeCompare(a.lastStudiedAt ?? ""));
}

async function teacherPreviewRequest<T>(path: string): Promise<T> {
  const { apiFetch } = await import("./auth-api");
  const response = await apiFetch(path);
  if (!response.ok) throw new StudyApiError(`Falha ao abrir prévia da jornada (${response.status}).`, response.status);
  return (await response.json()) as T;
}

export function fetchTeacherStudyPreview(journeyId: string) {
  return teacherPreviewRequest<JourneyStudyView>(`/api/journeys/${encodeURIComponent(journeyId)}/study-preview`);
}
export function fetchTeacherContentPreview(journeyId: string, contentId: string) {
  return teacherPreviewRequest<JourneyContentDetailView>(`/api/journeys/${encodeURIComponent(journeyId)}/study-preview/contents/${encodeURIComponent(contentId)}`);
}
