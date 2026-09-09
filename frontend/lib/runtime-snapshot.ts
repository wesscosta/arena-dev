import type { LiveStageState } from "./live-stage-api";
import type { PollParticipantState, PollState } from "./poll-api";
import type { TimerState } from "./timer-api";
import type { WordCloudParticipantState, WordCloudState } from "./word-cloud-api";

export type PublicBuzzerPress = {
  position: number;
  displayName: string;
  receivedAt: string;
};

export type PublicBuzzerState = {
  status: "IDLE" | "OPEN" | "CLOSED";
  roundId?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
  presses: PublicBuzzerPress[];
};

export type BuzzerParticipantState = {
  roundId?: string | null;
  position?: number | null;
};

export type PublicBossState = {
  name: string;
  maxHp: number;
  currentHp: number;
};

export type PublicRuntimeSnapshot = {
  stage: LiveStageState;
  buzzer: PublicBuzzerState;
  timer: TimerState;
  wordCloud: WordCloudState;
  poll: PollState;
  boss?: PublicBossState | null;
};

export type ParticipantRuntimeSnapshot = PublicRuntimeSnapshot & {
  buzzerParticipant: BuzzerParticipantState;
  wordCloudParticipant: WordCloudParticipantState;
  pollParticipant: PollParticipantState;
};

export function reconnectDelayMs(attempt: number) {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  return Math.min(10_000, 1_000 * (2 ** Math.min(safeAttempt, 4)));
}
