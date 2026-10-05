import { apiRequest } from "./http/client";

export type AssessmentQueueItem = { submissionId:string; enrollmentId:string; displayName:string; studentName:string; status:"SUBMITTED"|"UNDER_REVIEW"; priority:number; submittedAt:string|null; updatedAt:string|null; itemCount:number };
export type AssessmentQueue = { activityId:string; activityTitle:string; total:number; waiting:number; inReview:number; items:AssessmentQueueItem[] };
export type BatchSuggestionResult = { requested:number; succeeded:number; failed:number; items:Array<{submissionId:string;success:boolean;suggestionId:string|null;message:string}> };

function batchAssessmentRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init, {
    errorMessage: (status) => `Falha na triagem (${status}).`,
  });
}
export function fetchAssessmentQueue(activityId:string){ return batchAssessmentRequest<AssessmentQueue>(`/api/activities/${activityId}/assessment/batch/queue`); }
export function prepareBatchAiSuggestions(activityId:string, submissionIds:string[]){ return batchAssessmentRequest<BatchSuggestionResult>(`/api/activities/${activityId}/assessment/batch/ai-suggestions`,{method:"POST",body:JSON.stringify({submissionIds})}); }
