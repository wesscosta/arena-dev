import { apiRequest } from "./http/client";
import type { Activity, ArenaData, GameSession, SessionParticipant } from "./types";

/** Server-owned classroom overview. One HTTP request, no per-classroom/per-session fan-out. */
type SessionSummary = Pick<GameSession, "id" | "classroomId" | "title" | "status" | "startedAt"> & {
  endedAt: string | null;
};

type DashboardSnapshot = Pick<ArenaData, "classrooms" | "students" | "enrollments" | "scoreEvents"> & {
  sessions: SessionSummary[];
  sessionParticipants: SessionParticipant[];
  activities: Activity[];
};

export function normalizeDashboardBootstrap(snapshot: DashboardSnapshot): Pick<ArenaData,
  "classrooms" | "students" | "enrollments" | "sessions" | "sessionParticipants" | "scoreEvents" | "activities"> {
  const participantsBySession = new Map<string, string[]>();
  for (const participant of snapshot.sessionParticipants) {
    if (!participant.present) continue;
    const members = participantsBySession.get(participant.sessionId) ?? [];
    members.push(participant.studentId);
    participantsBySession.set(participant.sessionId, members);
  }
  const sessions: GameSession[] = snapshot.sessions.map((session) => ({
    ...session,
    endedAt: session.endedAt ?? undefined,
    presentStudentIds: participantsBySession.get(session.id) ?? [],
    drawCounts: {},
    selectorPresentation: "GRID_SPOTLIGHT",
    answeredQuestionIds: [],
    groups: [],
    groupSize: 2,
  }));
  // Preserve the normalization guarantees of the older per-domain adapters. The database
  // allows null on optional fields, while ArenaData uses empty strings or undefined.
  return {
    classrooms: snapshot.classrooms.map((item) => ({ ...item,
      code: item.code ?? "", themeColor: item.themeColor ?? "emerald",
      themeIcon: item.themeIcon ?? "code", studentStudyAccessEnabled: item.studentStudyAccessEnabled ?? false,
    })),
    students: snapshot.students.map((item) => ({ ...item,
      registration: item.registration ?? "", nickname: item.nickname ?? "",
    })),
    enrollments: snapshot.enrollments.map((item) => ({ ...item,
      preferredName: item.preferredName ?? "",
    })),
    sessions,
    sessionParticipants: snapshot.sessionParticipants.map((item) => ({ ...item,
      registration: item.registration ?? "", nickname: item.nickname ?? "",
      preferredName: item.preferredName ?? "", displayName: item.displayName ?? item.name,
    })),
    scoreEvents: snapshot.scoreEvents.map((item) => ({ ...item,
      sessionId: item.sessionId ?? undefined, activityId: item.activityId ?? undefined,
      questionId: item.questionId ?? undefined, reversalOf: item.reversalOf ?? undefined,
    })),
    activities: snapshot.activities.map((item) => ({ ...item,
      topic: item.topic ?? undefined, copiedFromActivityId: item.copiedFromActivityId ?? undefined,
      copiedFromClassroomId: item.copiedFromClassroomId ?? undefined,
      resource: { kind: item.resource?.kind ?? "INTERNAL",
        platform: item.resource?.platform ?? undefined, url: item.resource?.url ?? undefined },
      questions: item.questions ?? [],
    })),
  };
}

export async function fetchDashboardBootstrap(): Promise<Pick<ArenaData,
  "classrooms" | "students" | "enrollments" | "sessions" | "sessionParticipants" | "scoreEvents" | "activities">> {
  return normalizeDashboardBootstrap(await apiRequest<DashboardSnapshot>("/api/dashboard/bootstrap"));
}
