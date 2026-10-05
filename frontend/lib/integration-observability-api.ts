import { apiRequest } from "./http/client";

export type IntegrationHealthStatus = "NO_HISTORY" | "HEALTHY" | "ATTENTION" | "ERROR" | "SYNCING";
export type SyncFailureItem = { id:string; itemType:string; itemKey:string; status:"FAILED"; errorMessage:string|null; updatedAt:string };
export type SyncExecutionObservation = { id:string; scope:string; direction:"IMPORT"|"EXPORT"; status:"PENDING"|"RUNNING"|"PARTIALLY_SUCCEEDED"|"SUCCEEDED"|"FAILED"|"CANCELLED"; createdAt:string; startedAt:string|null; finishedAt:string|null; errorSummary:string|null; totalItems:number; succeededItems:number; failedItems:number; skippedItems:number; failures:SyncFailureItem[] };
export type IntegrationObservability = { connectionId:string; health:IntegrationHealthStatus; recentExecutions:number; failedExecutions:number; partialExecutions:number; runningExecutions:number; failedItems:number; lastSuccessAt:string|null; executions:SyncExecutionObservation[] };

export function fetchIntegrationObservability(connectionId: string): Promise<IntegrationObservability> {
  return apiRequest<IntegrationObservability>(
    `/api/integrations/connections/${connectionId}/observability`,
    undefined,
    { errorMessage: (status) => `Falha ao consultar saúde da integração (${status}).` },
  );
}
