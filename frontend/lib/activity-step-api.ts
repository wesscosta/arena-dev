import { apiFetch } from "./auth-api";
import type {
  ActivityStep,
  ActivityStepType,
  PollOption,
} from "./types";

type ApiErrorBody = { message?: string };

export class ActivityStepApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ActivityStepApiError";
  }
}

type StepView = {
  id: string;
  position: number;
  type: ActivityStepType;
  title: string | null;
  instructions: string | null;
  questionId: string | null;
  slideContent: string | null;
  wordCloud: {
    prompt: string;
    maxWordsPerParticipant: number;
    liveReveal: boolean;
  } | null;
  poll: {
    prompt: string;
    options: PollOption[];
    liveResults: boolean;
  } | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }

    throw new ActivityStepApiError(
      body?.message || `Falha na API do roteiro (${response.status}).`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

function mapStep(row: StepView): ActivityStep {
  return {
    id: row.id,
    position: row.position,
    type: row.type,
    title: row.title ?? undefined,
    instructions: row.instructions ?? undefined,
    questionId: row.questionId ?? undefined,
    slideContent: row.slideContent ?? undefined,
    wordCloud: row.wordCloud ?? undefined,
    poll: row.poll ?? undefined,
  };
}

export async function fetchActivitySteps(activityId: string): Promise<ActivityStep[]> {
  const rows = await request<StepView[]>(
    `/api/activities/${encodeURIComponent(activityId)}/steps`,
  );
  return rows.map(mapStep);
}

export async function replaceActivitySteps(
  activityId: string,
  steps: ActivityStep[],
): Promise<ActivityStep[]> {
  const payload = steps.map((step) => ({
    id: step.id ?? null,
    type: step.type,
    title: step.title?.trim() || null,
    instructions: step.instructions?.trim() || null,
    questionId: step.type === "QUESTION" ? step.questionId ?? null : null,
    slideContent: step.type === "SLIDE" ? step.slideContent?.trim() || null : null,
    wordCloud: step.type === "WORD_CLOUD"
      ? {
          prompt: step.wordCloud?.prompt.trim() ?? "",
          maxWordsPerParticipant: step.wordCloud?.maxWordsPerParticipant ?? 1,
          liveReveal: step.wordCloud?.liveReveal ?? false,
        }
      : null,
    poll: step.type === "POLL"
      ? {
          prompt: step.poll?.prompt.trim() ?? "",
          options: (step.poll?.options ?? []).map((option) => ({
            id: option.id.trim(),
            text: option.text.trim(),
          })),
          liveResults: step.poll?.liveResults ?? false,
        }
      : null,
  }));

  const rows = await request<StepView[]>(
    `/api/activities/${encodeURIComponent(activityId)}/steps`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );

  return rows.map(mapStep);
}
