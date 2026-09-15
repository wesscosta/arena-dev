
import { apiFetch } from "./auth-api";
export type LearningPlatformProvider = "TEAMS" | "GOOGLE_CLASSROOM";
export type IntegrationOverview = { activityId:string; activityTitle:string; providers:Array<{provider:LearningPlatformProvider; adapterConfigured:boolean; linked:boolean; externalClassId:string|null; externalAssignmentId:string|null; externalWebUrl:string|null}> };
export async function fetchIntegrationOverview(activityId:string){
  const response = await apiFetch(`/api/activities/${activityId}/integrations`);
  if(!response.ok) throw new Error(`Falha ao carregar integrações (${response.status}).`);
  return await response.json() as IntegrationOverview;
}
