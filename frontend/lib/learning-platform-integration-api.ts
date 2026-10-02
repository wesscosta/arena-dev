
import { apiRequest } from "./http/client";
export type LearningPlatformProvider = "TEAMS" | "GOOGLE_CLASSROOM";
export type IntegrationOverview = { activityId:string; activityTitle:string; providers:Array<{provider:LearningPlatformProvider; adapterConfigured:boolean; linked:boolean; externalClassId:string|null; externalAssignmentId:string|null; externalWebUrl:string|null}> };
export function fetchIntegrationOverview(activityId: string) {
  return apiRequest<IntegrationOverview>(
    `/api/activities/${activityId}/integrations`,
    undefined,
    { errorMessage: (status) => `Falha ao carregar integrações (${status}).` },
  );
}
