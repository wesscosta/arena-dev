export type ScoreCategory =
  | "QUESTION"
  | "DEBUG"
  | "CHALLENGE"
  | "SUBMISSION"
  | "COLLABORATION"
  | "BONUS"
  | "ADJUSTMENT";

export interface Classroom {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  nickname: string;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  classroomId: string;
  studentId: string;
  active: boolean;
  joinedAt: string;
}

export interface BossState {
  name: string;
  maxHp: number;
  currentHp: number;
}

export interface GameSession {
  id: string;
  classroomId: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  presentStudentIds: string[];
  drawCounts: Record<string, number>;
  lastDrawnStudentId?: string;
  boss?: BossState;
}

export interface ScoreEvent {
  id: string;
  classroomId: string;
  studentId: string;
  sessionId?: string;
  points: number;
  category: ScoreCategory;
  description: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  classroomId: string;
  title: string;
  points: number;
  onTimeBonus: number;
  createdAt: string;
}

export interface GroupHistory {
  id: string;
  classroomId: string;
  sessionId?: string;
  createdAt: string;
  groups: string[][];
}

export interface ArenaData {
  classrooms: Classroom[];
  students: Student[];
  enrollments: Enrollment[];
  sessions: GameSession[];
  scoreEvents: ScoreEvent[];
  activities: Activity[];
  groupHistory: GroupHistory[];
  activeClassroomId?: string;
  currentSessionId?: string;
}
