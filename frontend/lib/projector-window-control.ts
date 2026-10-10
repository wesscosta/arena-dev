/** Communication between the teacher tab and the independently opened projector tab.
 * Local to one browser profile/origin; this is not a server-side projection state. */
export const PROJECTOR_HEARTBEAT_MS = 2000;
export const PROJECTOR_STALE_MS = 6500;

export type ProjectorPresence = {
  instanceId: string;
  observedAt: number;
};

export type ProjectorCloseCommand = {
  kind: "close";
  issuedAt: number;
};

export function projectorPresenceKey(code: string) {
  return `arena:projector:presence:${code}`;
}
export function projectorCommandKey(code: string) {
  return `arena:projector:command:${code}`;
}

export function readProjectorPresence(code: string): boolean {
  if (!code || typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(projectorPresenceKey(code));
    if (!raw) return false;
    const value = JSON.parse(raw) as ProjectorPresence;
    return typeof value.instanceId === "string"
      && typeof value.observedAt === "number"
      && Date.now() - value.observedAt < PROJECTOR_STALE_MS
      && value.observedAt <= Date.now() + 1000;
  } catch {
    return false;
  }
}

export function requestProjectorClose(code: string) {
  window.localStorage.setItem(projectorCommandKey(code), JSON.stringify({
    kind: "close",
    issuedAt: Date.now(),
  } satisfies ProjectorCloseCommand));
}
