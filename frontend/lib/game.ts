import type { GameSession, ScoreEvent, Student } from "./types";

export const LEVELS = [
  { name: "Aprendiz", min: 0, max: 99 },
  { name: "Dev Júnior", min: 100, max: 249 },
  { name: "Dev Pleno", min: 250, max: 449 },
  { name: "Dev Sênior", min: 450, max: 699 },
  { name: "Tech Lead", min: 700, max: 999 },
  { name: "Arquiteto", min: 1000, max: Number.POSITIVE_INFINITY },
] as const;

export function xpForStudent(events: ScoreEvent[], classroomId: string, studentId: string) {
  return events
    .filter((event) => event.classroomId === classroomId && event.studentId === studentId)
    .reduce((sum, event) => sum + event.points, 0);
}

export function getLevel(xp: number) {
  return LEVELS.find((level) => xp >= level.min && xp <= level.max) ?? LEVELS[0];
}

export function getLevelProgress(xp: number) {
  const level = getLevel(xp);
  if (!Number.isFinite(level.max)) return 100;
  const width = level.max - level.min + 1;
  return Math.max(0, Math.min(100, ((xp - level.min) / width) * 100));
}

export function weightedDraw(students: Student[], session: GameSession): Student | undefined {
  if (!students.length) return undefined;

  const eligible = students.length > 1 && session.lastDrawnStudentId
    ? students.filter((student) => student.id !== session.lastDrawnStudentId)
    : students;

  const pool = eligible.length ? eligible : students;
  const weighted = pool.map((student) => {
    const count = session.drawCounts[student.id] ?? 0;
    return { student, weight: 1 / Math.pow(count + 1, 1.35) };
  });

  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;

  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.student;
  }

  return weighted.at(-1)?.student;
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createBalancedGroups(studentIds: string[], groupSize: number, priorGroups: string[][][]) {
  if (groupSize < 2) groupSize = 2;
  const ids = [...studentIds];
  const pairFrequency = new Map<string, number>();

  for (const run of priorGroups) {
    for (const group of run) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const key = [group[i], group[j]].sort().join("|");
          pairFrequency.set(key, (pairFrequency.get(key) ?? 0) + 1);
        }
      }
    }
  }

  const randomTie = new Map(ids.map((id) => [id, Math.random()]));
  ids.sort((a, b) => (randomTie.get(a) ?? 0) - (randomTie.get(b) ?? 0));

  const groups: string[][] = [];
  while (ids.length) {
    const group = [ids.shift()!];
    while (group.length < groupSize && ids.length) {
      let bestIndex = 0;
      let bestScore = Number.POSITIVE_INFINITY;
      ids.forEach((candidate, index) => {
        const score = group.reduce((sum, member) => {
          const key = [member, candidate].sort().join("|");
          return sum + (pairFrequency.get(key) ?? 0);
        }, 0);
        if (score < bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      });
      group.push(ids.splice(bestIndex, 1)[0]);
    }
    groups.push(group);
  }

  if (groups.length > 1) {
    const last = groups.at(-1)!;
    if (last.length === 1 && groups[0].length > 2) {
      last.push(groups[0].pop()!);
    }
  }

  return groups;
}
