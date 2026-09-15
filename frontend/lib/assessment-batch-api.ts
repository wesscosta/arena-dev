import { apiFetch } from "./auth-api";

export type AssessmentQueueItem = { submissionId:string; enrollmentId:string; displayName:string; studentName:string; status:"SUBMITTED"|"UNDER_REVIEW"; priority:number; submittedAt:string|null; updatedAt:string|null; itemCount:number };
export type AssessmentQueue = { activityId:string; activityTitle:string; total:number; waiting:number; inReview:number; items:AssessmentQueueItem[] };
export type BatchSuggestionResult = { requested:number; succeeded:number; failed:number; items:Array<{submissionId:string;success:boolean;suggestionId:string|null;message:string}> };

async function request<T>(path:string, init?:RequestInit):Promise<T>{
  const response = await apiFetch(path, init);
  if(!response.ok){ let message=`Falha na triagem (${response.status}).`; try{ const body=await response.json() as {message?:string}; if(body.message) message=body.message; }catch{} throw new Error(message); }
  return await response.json() as T;
}
export function fetchAssessmentQueue(activityId:string){ return request<AssessmentQueue>(`/api/activities/${activityId}/assessment/batch/queue`); }
export function prepareBatchAiSuggestions(activityId:string, submissionIds:string[]){ return request<BatchSuggestionResult>(`/api/activities/${activityId}/assessment/batch/ai-suggestions`,{method:"POST",body:JSON.stringify({submissionIds})}); }
