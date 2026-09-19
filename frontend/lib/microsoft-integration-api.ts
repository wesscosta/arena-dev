import { apiFetch } from "./auth-api";

export type MicrosoftReadiness = {
  provider: "MICROSOFT_TEAMS";
  applicationCredentialsConfigured: boolean;
};

export type IntegrationConnection = {
  id: string;
  provider: "MICROSOFT_TEAMS" | "GOOGLE_CLASSROOM";
  displayName: string;
  externalTenantId: string | null;
  status: "DRAFT" | "ACTIVE" | "DISABLED";
};

export type MicrosoftEducationClass = {
  id: string;
  displayName: string;
  classCode: string | null;
  externalId: string | null;
  externalName: string | null;
  description: string | null;
  grade: string | null;
};

export type MicrosoftClassDiscovery = {
  connectionId: string;
  tenantId: string;
  count: number;
  classes: MicrosoftEducationClass[];
};

export type ClassroomLink = {
  id: string;
  connectionId: string;
  classroomId: string;
  externalClassroomId: string;
  externalWebUrl: string | null;
};

export type MicrosoftClassLinkResult = {
  linkId: string;
  connectionId: string;
  classroomId: string;
  microsoftClassId: string;
  microsoftDisplayName: string;
  microsoftClassCode: string | null;
};

export type MicrosoftRoster = {
  connectionId: string;
  classroomLinkId: string;
  classroomId: string;
  microsoftClassId: string;
  memberCount: number;
  studentCount: number;
  teacherCount: number;
  members: Array<{
    id: string;
    displayName: string;
    givenName: string | null;
    surname: string | null;
    userPrincipalName: string | null;
    primaryRole: string | null;
    externalId: string | null;
  }>;
};

export type StudentMatchStatus =
  | "ALREADY_LINKED"
  | "SAFE_MATCH"
  | "NEW_STUDENT"
  | "REVIEW_REQUIRED"
  | "AMBIGUOUS"
  | "CONFLICT"
  | "IGNORED_NON_STUDENT";

export type StudentMatchItem = {
  microsoftUserId: string;
  displayName: string;
  userPrincipalName: string | null;
  externalId: string | null;
  status: StudentMatchStatus;
  localStudentId: string | null;
  localEnrollmentId: string | null;
  localStudentName: string | null;
  reason: string;
};

export type StudentMatchPreview = {
  connectionId: string;
  classroomLinkId: string;
  classroomId: string;
  microsoftClassId: string;
  items: StudentMatchItem[];
  alreadyLinked: number;
  safeMatches: number;
  newStudents: number;
  reviewRequired: number;
  ambiguous: number;
  conflicts: number;
  ignored: number;
};

type ProblemBody = { detail?: string; message?: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    let body: ProblemBody | undefined;
    try {
      body = (await response.json()) as ProblemBody;
    } catch {
      body = undefined;
    }
    throw new Error(body?.detail || body?.message || `Falha na integração (${response.status}).`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const fetchMicrosoftReadiness = () =>
  request<MicrosoftReadiness>("/api/integrations/microsoft/readiness");

export const fetchIntegrationConnections = () =>
  request<IntegrationConnection[]>("/api/integrations/connections");

export const connectMicrosoft = (input: { displayName: string; tenantId: string }) =>
  request<IntegrationConnection>("/api/integrations/microsoft/connect", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const discoverMicrosoftClasses = (connectionId: string) =>
  request<MicrosoftClassDiscovery>(`/api/integrations/microsoft/connections/${connectionId}/classes`);

export const fetchClassroomLinks = (connectionId: string) =>
  request<ClassroomLink[]>(`/api/integrations/connections/${connectionId}/classroom-links`);

export const linkMicrosoftClass = (
  connectionId: string,
  input: { classroomId: string; microsoftClassId: string },
) =>
  request<MicrosoftClassLinkResult>(
    `/api/integrations/microsoft/connections/${connectionId}/class-links`,
    { method: "POST", body: JSON.stringify(input) },
  );

export const fetchMicrosoftRoster = (connectionId: string, classroomLinkId: string) =>
  request<MicrosoftRoster>(
    `/api/integrations/microsoft/connections/${connectionId}/class-links/${classroomLinkId}/roster`,
  );

export const fetchStudentMatchPreview = (connectionId: string, classroomLinkId: string) =>
  request<StudentMatchPreview>(
    `/api/integrations/microsoft/connections/${connectionId}/class-links/${classroomLinkId}/student-match-preview`,
  );

export type StudentMatchApplyAction =
  | "APPLY_SUGGESTED"
  | "CREATE_NEW_STUDENT"
  | "LINK_EXISTING_STUDENT";

export type StudentMatchApplyResult = {
  microsoftUserId: string;
  studentId: string;
  enrollmentId: string;
  externalStudentLinkId: string;
  studentName: string;
  action: StudentMatchApplyAction;
  changed: boolean;
};

export const applyStudentMatch = (
  connectionId: string,
  classroomLinkId: string,
  input: {
    microsoftUserId: string;
    action: StudentMatchApplyAction;
    localStudentId?: string | null;
  },
) =>
  request<StudentMatchApplyResult>(
    `/api/integrations/microsoft/connections/${connectionId}/class-links/${classroomLinkId}/student-match-apply`,
    {
      method: "POST",
      body: JSON.stringify({
        microsoftUserId: input.microsoftUserId,
        action: input.action,
        localStudentId: input.localStudentId ?? null,
      }),
    },
  );


export type RosterReconciliationStatus =
  | "IN_SYNC"
  | "REMOTE_MISSING"
  | "LOCAL_INACTIVE"
  | "BROKEN_LINK";

export type RosterReconciliationItem = {
  externalStudentLinkId: string;
  microsoftUserId: string;
  enrollmentId: string;
  studentId: string | null;
  studentName: string | null;
  status: RosterReconciliationStatus;
  reason: string;
};

export type RosterReconciliation = {
  connectionId: string;
  classroomLinkId: string;
  classroomId: string;
  microsoftClassId: string;
  items: RosterReconciliationItem[];
  inSync: number;
  remoteMissing: number;
  localInactive: number;
  brokenLinks: number;
};

export type RosterReconciliationAction =
  | "DEACTIVATE_ENROLLMENT"
  | "REACTIVATE_ENROLLMENT";

export type RosterReconciliationApplyResult = {
  externalStudentLinkId: string;
  enrollmentId: string;
  studentId: string;
  studentName: string;
  action: RosterReconciliationAction;
  enrollmentActive: boolean;
};

export const fetchRosterReconciliation = (
  connectionId: string,
  classroomLinkId: string,
) =>
  request<RosterReconciliation>(
    `/api/integrations/microsoft/connections/${connectionId}/class-links/${classroomLinkId}/reconciliation`,
  );

export const applyRosterReconciliation = (
  connectionId: string,
  classroomLinkId: string,
  externalStudentLinkId: string,
  action: RosterReconciliationAction,
) =>
  request<RosterReconciliationApplyResult>(
    `/api/integrations/microsoft/connections/${connectionId}/class-links/${classroomLinkId}/reconciliation/${externalStudentLinkId}`,
    {
      method: "POST",
      body: JSON.stringify({ action }),
    },
  );
