import type { SessionTimer, TimerState, TimerStatus } from "./timer-api";

export const TIMER_PRESETS = [
  { seconds: 30, label: "30 s" },
  { seconds: 60, label: "1 min" },
  { seconds: 120, label: "2 min" },
  { seconds: 300, label: "5 min" },
  { seconds: 600, label: "10 min" },
  { seconds: 900, label: "15 min" },
  { seconds: 1200, label: "20 min" },
  { seconds: 1800, label: "30 min" },
] as const;

export type TimerDurationParts = {
  hours: number;
  minutes: number;
  seconds: number;
};

export function splitTimerDuration(totalSeconds: number): TimerDurationParts {
  const safe = Math.max(0, Math.min(86_400, Math.floor(totalSeconds)));
  return {
    hours: Math.floor(safe / 3600),
    minutes: Math.floor((safe % 3600) / 60),
    seconds: safe % 60,
  };
}

export function timerDurationFromParts(parts: TimerDurationParts) {
  const hours = Math.max(0, Math.min(24, Math.floor(parts.hours || 0)));
  const minutes = Math.max(0, Math.min(59, Math.floor(parts.minutes || 0)));
  const seconds = Math.max(0, Math.min(59, Math.floor(parts.seconds || 0)));
  return Math.min(86_400, hours * 3600 + minutes * 60 + seconds);
}

export function estimatedServerNowMs(state: TimerState, clientNowMs = Date.now()) {
  if (!state.serverOccurredAt || state.receivedAtMs === undefined) return clientNowMs;

  const serverAnchor = Date.parse(state.serverOccurredAt);
  if (!Number.isFinite(serverAnchor)) return clientNowMs;

  return serverAnchor + Math.max(0, clientNowMs - state.receivedAtMs);
}

export function timerRemainingSeconds(state: TimerState, clientNowMs = Date.now()) {
  const timer = state.timer;
  if (!timer) return 0;
  if (timer.status !== "RUNNING" || !timer.endsAt) {
    return Math.max(0, timer.remainingSeconds);
  }

  const endsAt = Date.parse(timer.endsAt);
  if (!Number.isFinite(endsAt)) return Math.max(0, timer.remainingSeconds);

  const serverNow = estimatedServerNowMs(state, clientNowMs);
  return Math.max(0, Math.ceil((endsAt - serverNow) / 1000));
}

export function effectiveTimerStatus(
  timer: SessionTimer,
  remainingSeconds: number,
): TimerStatus {
  if (timer.status === "RUNNING" && remainingSeconds <= 0) return "FINISHED";
  return timer.status;
}

export function formatTimer(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  return [minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function timerStatusLabel(status: TimerStatus) {
  switch (status) {
    case "READY":
      return "Pronto";
    case "RUNNING":
      return "Em andamento";
    case "PAUSED":
      return "Pausado";
    case "FINISHED":
      return "Encerrado";
    case "CANCELLED":
      return "Cancelado";
  }
}
