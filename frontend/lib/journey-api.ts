import { apiRequest } from "./http/client";
import { HttpApiError } from "./http/errors";

export type JourneyStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type JourneyUnlockRule = "IMMEDIATE" | "PREVIOUS_STAGE_COMPLETED";
export type JourneyCompletionRule = "MANUAL" | "ACTIVITY_SUBMITTED" | "ACTIVITY_GRADED";

export type JourneyStage = {
  id: string;
  position: number;
  title: string;
  description: string | null;
  activityId: string | null;
  unlockRule: JourneyUnlockRule;
  completionRule: JourneyCompletionRule;
  sectionId?: string | null;
  sectionTitle?: string | null;
  itemType?: "CONTENT" | "ACTIVITY" | "QUIZ" | "CHALLENGE" | "CHECKPOINT" | "EXTERNAL_RESOURCE";
  learningResourceId?: string | null;
  resourceSnapshotRevision?: number | null;
  resourceCurrentRevision?: number | null;
  resourceUpdateAvailable?: boolean;
};

export type Journey = {
  id: string;
  classroomId: string;
  title: string;
  description: string | null;
  status: JourneyStatus;
  stages: JourneyStage[];
  createdAt: string;
  updatedAt: string;
  /** Students cannot copy this Journey's content in the reader. */
  copyProtected: boolean;
  /** Null means the original sequential-unlock policy; N exposes the first N contents. */
  releasedStageCount: number | null;
};

export type JourneyStageInput = {
  id?: string;
  title: string;
  description?: string;
  activityId?: string;
  unlockRule: JourneyUnlockRule;
  completionRule: JourneyCompletionRule;
  sectionId?: string;
  sectionTitle?: string;
  itemType?: JourneyStage["itemType"];
  learningResourceId?: string;
};

export type JourneyInput = {
  classroomId: string;
  title: string;
  description?: string;
  /** Omit to keep the structure, e.g. when changing a setting of a published Journey. */
  stages?: JourneyStageInput[];
  copyProtected?: boolean;
};


export class JourneyApiError extends HttpApiError {
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message, status, fields);
    this.name = "JourneyApiError";
  }
}

function journeyRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init, {
    errorMessage: (status) => `Falha na API de jornadas (${status}).`,
    errorFactory: (message, status) => new JourneyApiError(message, status),
  });
}

export function fetchJourneys(classroomId: string) {
  return journeyRequest<Journey[]>(`/api/journeys?classroomId=${encodeURIComponent(classroomId)}`);
}

export function fetchJourney(id: string) {
  return journeyRequest<Journey>(`/api/journeys/${encodeURIComponent(id)}`);
}

export function createJourney(input: JourneyInput) {
  return journeyRequest<Journey>("/api/journeys", { method: "POST", body: JSON.stringify(input) });
}

export function updateJourney(id: string, input: JourneyInput) {
  return journeyRequest<Journey>(`/api/journeys/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
}

export function changeJourneyRelease(id: string, releasedStageCount: number | null) {
  return journeyRequest<Journey>("/api/journeys/" + encodeURIComponent(id) + "/release", {
    method: "PATCH", body: JSON.stringify({ releasedStageCount }),
  });
}

export type JourneyLibraryExport = { created: number; alreadyInLibrary: number; withoutContent: number; createdIds: string[] };

/**
 * Saves the whole Journey to the Library as one Markdown material (Journey H1,
 * modules H2, contents H3); the Journey is unchanged.
 */
export function saveJourneyToLibrary(id: string) {
  return journeyRequest<JourneyLibraryExport>(`/api/journeys/${encodeURIComponent(id)}/library-export?scope=JOURNEY`, { method: "POST", body: "{}" });
}

export function publishJourney(id: string) {
  return journeyRequest<Journey>(`/api/journeys/${encodeURIComponent(id)}/publish`, { method: "POST", body: "{}" });
}

export function archiveJourney(id: string) {
  return journeyRequest<Journey>(`/api/journeys/${encodeURIComponent(id)}/archive`, { method: "POST", body: "{}" });
}

export function refreshJourneyStageResource(journeyId: string, stageId: string) {
  return journeyRequest<Journey>(
    `/api/journeys/${encodeURIComponent(journeyId)}/stages/${encodeURIComponent(stageId)}/refresh-resource`,
    { method: "POST", body: "{}" },
  );
}

export type JourneyStageContent = {
  stageId: string;
  title: string;
  body: string | null;
  format: string;
  /** The text belongs to a Library material: saving it also updates the Library. */
  libraryMaterial: boolean;
  readOnly: boolean;
};

export function fetchJourneyStageContent(journeyId: string, stageId: string) {
  return journeyRequest<JourneyStageContent>(
    `/api/journeys/${encodeURIComponent(journeyId)}/stages/${encodeURIComponent(stageId)}/content`,
  );
}

/** Corrects a stage's text in place; also on a published Journey, keeping student progress. */
export function updateJourneyStageContent(journeyId: string, stageId: string, body: string) {
  return journeyRequest<Journey>(
    `/api/journeys/${encodeURIComponent(journeyId)}/stages/${encodeURIComponent(stageId)}/content`,
    { method: "PUT", body: JSON.stringify({ body }) },
  );
}

export type JourneyRedemptionCode = { code: string | null; active: boolean; redeemedCount: number };
export function fetchJourneyRedemption(id: string) { return journeyRequest<JourneyRedemptionCode>(`/api/journeys/${encodeURIComponent(id)}/redemption`); }
export function enableJourneyRedemption(id: string) { return journeyRequest<JourneyRedemptionCode>(`/api/journeys/${encodeURIComponent(id)}/redemption/enable`, { method: "POST", body: "{}" }); }
export function regenerateJourneyRedemption(id: string) { return journeyRequest<JourneyRedemptionCode>(`/api/journeys/${encodeURIComponent(id)}/redemption/regenerate`, { method: "POST", body: "{}" }); }
export function disableJourneyRedemption(id: string) {
  return journeyRequest<void>(`/api/journeys/${encodeURIComponent(id)}/redemption`, { method: "DELETE" });
}
