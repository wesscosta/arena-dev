import { apiFetch } from "./auth-api";

export type IntegrationHealthStatus = "NO_HISTORY" | "HEALTHY" | "ATTENTION" | "ERROR" | "SYNCING";
export type SyncFailureItem = { id:string; itemType:string; itemKey:string; status:"FAILED"; errorMessage:string|null; updatedAt:string };
export type SyncExecutionObservation = { id:string; scope:string; direction:"IMPORT"|"EXPORT"; status:"PENDING"|"RUNNING"|"PARTIALLY_SUCCEEDED"|"SUCCEEDED"|"FAILED"|"CANCELLED"; createdAt:string; startedAt:string|null; finishedAt:string|null; errorSummary:string|null; totalItems:number; succeededItems:number; failedItems:number; skippedItems:number; failures:SyncFailureItem[] };
export type IntegrationObservability = { connectionId:string; health:IntegrationHealthStatus; recentExecutions:number; failedExecutions:number; partialExecutions:number; runningExecutions:number; failedItems:number; lastSuccessAt:string|null; executions:SyncExecutionObservation[] };

export async function fetchIntegrationObservability(connectionId:string):Promise<IntegrationObservability>{
  const response=await apiFetch(`/api/integrations/connections/${connectionId}/observability`);
  if(!response.ok) throw new Error(`Falha ao consultar saúde da integração (${response.status}).`);
  return await response.json() as IntegrationObservability;
}
