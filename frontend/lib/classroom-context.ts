import type { Classroom } from "./types";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function filterClassroomsForContext(
  classrooms: Classroom[],
  query: string,
): Classroom[] {
  const needle = normalize(query);
  if (!needle) return classrooms;

  return classrooms.filter((classroom) =>
    normalize(classroom.name).includes(needle)
    || normalize(classroom.code ?? "").includes(needle)
  );
}

export function classroomContextStatus(
  classroom: Classroom,
  hasLiveSession: boolean,
): "LIVE" | "INACTIVE" | undefined {
  if (hasLiveSession) return "LIVE";
  if (!classroom.active) return "INACTIVE";
  return undefined;
}
