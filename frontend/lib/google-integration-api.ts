import { apiFetch } from "./auth-api";

export type GoogleReadiness={provider:"GOOGLE_CLASSROOM";delegatedOAuthConfigured:boolean};
export type GoogleClassroomCourse={id:string;name:string;section:string|null;descriptionHeading:string|null;room:string|null;courseState:string|null;alternateLink:string|null;ownerId:string|null};
export type GoogleCourseDiscovery={connectionId:string;connectionName:string;courses:GoogleClassroomCourse[];count:number};

async function request<T>(path:string):Promise<T>{
 const response=await apiFetch(path,{headers:{"Content-Type":"application/json"}});
 if(!response.ok) throw new Error(`Falha na integração Google (${response.status}).`);
 return await response.json() as T;
}
export const fetchGoogleReadiness=()=>request<GoogleReadiness>("/api/integrations/google/readiness");
export const startGoogleOAuth=()=>request<{authorizationUrl:string}>("/api/integrations/google/oauth/start");
export const discoverGoogleCourses=(connectionId:string)=>request<GoogleCourseDiscovery>(`/api/integrations/google/connections/${connectionId}/courses`);
