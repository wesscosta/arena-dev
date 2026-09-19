import {
  fetchClassroomLinks,
  fetchIntegrationConnections,
  type IntegrationConnection,
} from "./microsoft-integration-api";

export type ClassroomIntegrationPlatform =
  | "MICROSOFT_TEAMS"
  | "GOOGLE_CLASSROOM";

export type ClassroomIntegrationState = {
  platformsByClassroomId: Record<string, ClassroomIntegrationPlatform[]>;
  connections: IntegrationConnection[];
};

export async function fetchClassroomIntegrationState(): Promise<ClassroomIntegrationState> {
  const connections = await fetchIntegrationConnections();
  const activeConnections = connections.filter(
    (connection) => connection.status === "ACTIVE",
  );

  const linkGroups = await Promise.all(
    activeConnections.map(async (connection) => ({
      connection,
      links: await fetchClassroomLinks(connection.id),
    })),
  );

  const platformsByClassroomId: Record<string, ClassroomIntegrationPlatform[]> = {};

  for (const group of linkGroups) {
    for (const link of group.links) {
      const current = platformsByClassroomId[link.classroomId] ?? [];
      if (!current.includes(group.connection.provider)) {
        platformsByClassroomId[link.classroomId] = [
          ...current,
          group.connection.provider,
        ];
      }
    }
  }

  return { platformsByClassroomId, connections };
}


export type ClassroomIntegrationSummaryItem = {
  classroomLinkId: string;
  connectionId: string;
  provider: ClassroomIntegrationPlatform | null;
  connectionName: string;
  connectionStatus: string | null;
  externalClassroomId: string;
  externalWebUrl: string | null;
  linkedStudents: number;
  mappedActivities: number;
};

export type ClassroomIntegrationSummary = {
  classroomId: string;
  integrations: ClassroomIntegrationSummaryItem[];
};

export async function fetchClassroomIntegrationSummary(
  classroomId: string,
): Promise<ClassroomIntegrationSummary> {
  const response = await fetch(`/api/integrations/classrooms/${classroomId}/summary`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar integração da turma (${response.status}).`);
  }

  return (await response.json()) as ClassroomIntegrationSummary;
}
