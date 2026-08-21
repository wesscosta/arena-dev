export type ScoreSource = "ARENA" | "ACTIVITY" | "BUZZER" | "BOSS" | "MANUAL";

export type ScoreCategory =
  | "QUESTION"
  | "DEBUG"
  | "CHALLENGE"
  | "SUBMISSION"
  | "COLLABORATION"
  | "BONUS"
  | "ADJUSTMENT";


export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "OPEN"
  | "TRUE_FALSE"
  | "BUG_FIX"
  | "ANALYSIS"
  | "PRACTICAL"
  | "SCENARIO";

export type QuestionDifficulty = "EASY" | "INTERMEDIATE" | "HARD";

export interface QuestionOption {
  id: string;
  text: string;
}

export interface ActivityQuestion {
  id: string;
  type: QuestionType;
  statement: string;
  difficulty: QuestionDifficulty;
  points: number;
  options?: QuestionOption[];
  answer?: string | boolean;
  expectedAnswer?: string;
  explanation?: string;
  code?: string;
  language?: string;
  expectedOutcome?: string;
  evaluationCriteria?: string[];
}

export interface ActivityResource {
  kind: "INTERNAL" | "EXTERNAL";
  platform?: string;
  url?: string;
}

export interface QuestionPackage {
  version: "1.0";
  activity?: {
    title?: string;
    topic?: string;
    difficulty?: QuestionDifficulty;
  };
  questions: ActivityQuestion[];
}

export interface Classroom {
  id: string;
  name: string;
  code: string;
  active?: boolean;
  createdAt: string;
}

export interface Student {
  id: string;
  registration?: string;
  name: string;
  nickname: string;
  active?: boolean;
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
  activityId?: string;
  currentQuestionId?: string;
  answeredQuestionIds?: string[];
}

export interface ScoreEvent {
  id: string;
  classroomId: string;
  studentId: string;
  sessionId?: string;
  points: number;
  category: ScoreCategory;
  description: string;
  source?: ScoreSource;
  activityId?: string;
  questionId?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  classroomId: string;
  title: string;
  topic?: string;
  points: number;
  onTimeBonus: number;
  resource?: ActivityResource;
  questions?: ActivityQuestion[];
  createdAt: string;
  updatedAt?: string;
  copiedFromActivityId?: string;
  copiedFromClassroomId?: string;
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
