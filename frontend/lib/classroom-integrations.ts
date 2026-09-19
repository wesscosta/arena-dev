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
