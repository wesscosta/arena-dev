import { apiRequest } from "./http/client";

export type GoogleReadiness={provider:"GOOGLE_CLASSROOM";delegatedOAuthConfigured:boolean};
export type GoogleClassroomCourse={id:string;name:string;section:string|null;descriptionHeading:string|null;room:string|null;courseState:string|null;alternateLink:string|null;ownerId:string|null};
export type GoogleCourseDiscovery={connectionId:string;connectionName:string;courses:GoogleClassroomCourse[];count:number};

function googleRequest<T>(path: string): Promise<T> {
  return apiRequest<T>(path, undefined, {
    errorMessage: (status) => `Falha na integração Google (${status}).`,
  });
}
export const fetchGoogleReadiness=()=>googleRequest<GoogleReadiness>("/api/integrations/google/readiness");
export const startGoogleOAuth=()=>googleRequest<{authorizationUrl:string}>("/api/integrations/google/oauth/start");
export const discoverGoogleCourses=(connectionId:string)=>googleRequest<GoogleCourseDiscovery>(`/api/integrations/google/connections/${connectionId}/courses`);
