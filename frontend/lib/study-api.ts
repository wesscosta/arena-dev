import { apiRequest } from "./http/client";
import { deviceClaimStorageKey } from "./app-state";
import { HttpApiError } from "./http/errors";

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

export class StudyApiError extends HttpApiError {
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message, status, fields);
    this.name = "StudyApiError";
  }
}

function studyRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(
    path,
    {
      ...init,
      headers: {
        "X-Study-Token": token,
        ...init?.headers,
      },
    },
    {
      credentials: "omit",
      errorMessage: (status) => `Falha ao carregar estudos (${status}).`,
      errorFactory: (message, status) => new StudyApiError(message, status),
    },
  );
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
  return studyRequest<AchievementSummary>("/api/learn/achievements", token);
}
export async function fetchAllStudyAchievements(): Promise<AchievementSummary> {
  for (const claim of studyDeviceClaims()) {
    try { return await fetchStudyAchievements(claim.token); } catch { /* try another valid device claim */ }
  }
  throw new StudyApiError("Não foi possível carregar suas conquistas.", 401);
}

export function fetchStudyLiveSessions(token: string) {
  return studyRequest<LiveSessionSummary[]>("/api/learn/live", token);
}
export type JourneyRedemptionResult = { journeyId: string; title: string; description: string | null; alreadyAdded: boolean };
export type JourneyRedemptionPreview = { journeyId: string; title: string; classroomId: string; classroomName: string };
export type JourneyBootstrapRedemption = {
  classroomId: string;
  deviceToken: string;
  deviceExpiresAt: string;
  redemption: JourneyRedemptionResult;
};

export function previewJourneyCode(code: string) {
  return apiRequest<JourneyRedemptionPreview>(`/api/learn/journeys/redeem/${encodeURIComponent(code.trim().toUpperCase())}`, undefined, {
    credentials: "omit",
    errorMessage: (status) => `Não foi possível validar o código da Jornada (${status}).`,
    errorFactory: (message, status) => new StudyApiError(message, status),
  });
}

export async function bootstrapJourneyRedemption(code: string, identity: string): Promise<JourneyBootstrapRedemption> {
  const result = await apiRequest<JourneyBootstrapRedemption>("/api/learn/journeys/redeem/bootstrap", {
    method: "POST",
    body: JSON.stringify({ code: code.trim().toUpperCase(), identity: identity.trim() }),
  }, {
    credentials: "omit",
    errorMessage: (status) => `Não foi possível vincular a Jornada (${status}).`,
    errorFactory: (message, status) => new StudyApiError(message, status),
  });
  window.localStorage.setItem(deviceClaimStorageKey(result.classroomId), result.deviceToken);
  return result;
}

export async function redeemJourneyCode(code: string): Promise<JourneyRedemptionResult> {
  const claims = studyDeviceClaims();
  if (!claims.length) throw new StudyApiError("Entre em uma aula ao vivo primeiro para criar seu perfil neste dispositivo.", 401);
  let lastError: unknown;
  for (const claim of claims) {
    try {
      return await studyRequest<JourneyRedemptionResult>("/api/learn/journeys/redeem", claim.token, {
        method: "POST", body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
    } catch (error) { lastError = error; }
  }
  throw lastError instanceof Error ? lastError : new StudyApiError("Não foi possível adicionar a Jornada.", 400);
}

export function fetchStudyJourneys(token: string) { return studyRequest<JourneyStudySummary[]>("/api/learn/journeys", token); }
export function fetchStudyJourney(id: string, token: string) { return studyRequest<JourneyStudyView>(`/api/learn/journeys/${encodeURIComponent(id)}`, token); }
export function fetchStudyContent(journeyId: string, contentId: string, token: string) {
  return studyRequest<JourneyContentDetailView>(`/api/learn/journeys/${encodeURIComponent(journeyId)}/contents/${encodeURIComponent(contentId)}`, token);
}
export function startStudyContent(journeyId: string, contentId: string, token: string) {
  return studyRequest<JourneyStudyView>(`/api/learn/journeys/${encodeURIComponent(journeyId)}/contents/${encodeURIComponent(contentId)}/start`, token, { method: "POST", body: "{}" });
}
export function completeStudyContent(journeyId: string, contentId: string, token: string) {
  return studyRequest<JourneyStudyView>(`/api/learn/journeys/${encodeURIComponent(journeyId)}/contents/${encodeURIComponent(contentId)}/complete`, token, { method: "POST", body: "{}" });
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

function teacherPreviewRequest<T>(path: string): Promise<T> {
  return apiRequest<T>(path, undefined, {
    errorMessage: (status) => `Falha ao abrir prévia da jornada (${status}).`,
    errorFactory: (message, status) => new StudyApiError(message, status),
  });
}

export function fetchTeacherStudyPreview(journeyId: string) {
  return teacherPreviewRequest<JourneyStudyView>(`/api/journeys/${encodeURIComponent(journeyId)}/study-preview`);
}
export function fetchTeacherContentPreview(journeyId: string, contentId: string) {
  return teacherPreviewRequest<JourneyContentDetailView>(`/api/journeys/${encodeURIComponent(journeyId)}/study-preview/contents/${encodeURIComponent(contentId)}`);
}
