// Heartbeat for the live-session sockets (teacher, student and projector).
// A socket can stay "open" on the client after a Wi-Fi switch or device sleep
// while the server is gone (half-open). The client already reconnects on
// "close", so the heartbeat only has to notice silence and close the socket.

export const HEARTBEAT_INTERVAL_MS = 25_000;
export const HEARTBEAT_TIMEOUT_MS = 10_000;
/** Close code for a silent connection; clients reconnect on it (only 1008 stops them). */
export const HEARTBEAT_CLOSE_CODE = 4000;

type HeartbeatSocket = Pick<WebSocket, "readyState" | "send" | "close" | "addEventListener">;

type HeartbeatEnv = {
  setInterval: (callback: () => void, ms: number) => number;
  clearInterval: (id: number) => void;
  setTimeout: (callback: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
  /** Page-resume signals (visibilitychange, pageshow); omitted outside the browser. */
  onResume?: (callback: () => void) => () => void;
};

const OPEN = 1;

function browserEnv(): HeartbeatEnv {
  return {
    setInterval: (callback, ms) => window.setInterval(callback, ms),
    clearInterval: (id) => window.clearInterval(id),
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
    clearTimeout: (id) => window.clearTimeout(id),
    onResume: (callback) => {
      const onVisibility = () => { if (document.visibilityState === "visible") callback(); };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pageshow", callback);
      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pageshow", callback);
      };
    },
  };
}

/**
 * Sends PING every HEARTBEAT_INTERVAL_MS once the socket is open and closes it
 * when no frame arrives within HEARTBEAT_TIMEOUT_MS of a ping. Any frame (PONG
 * or a domain event) counts as a sign of life. On page resume it pings at once.
 */
export function attachHeartbeat(socket: HeartbeatSocket, env: HeartbeatEnv = browserEnv()) {
  let interval: number | undefined;
  let deadline: number | undefined;
  let stopResume: (() => void) | undefined;

  const clearDeadline = () => {
    if (deadline !== undefined) env.clearTimeout(deadline);
    deadline = undefined;
  };

  const ping = () => {
    if (socket.readyState !== OPEN) return;
    socket.send(JSON.stringify({ type: "PING" }));
    if (deadline !== undefined) return;
    deadline = env.setTimeout(() => {
      deadline = undefined;
      if (socket.readyState === OPEN) socket.close(HEARTBEAT_CLOSE_CODE, "heartbeat timeout");
    }, HEARTBEAT_TIMEOUT_MS);
  };

  const stop = () => {
    if (interval !== undefined) env.clearInterval(interval);
    interval = undefined;
    clearDeadline();
    stopResume?.();
    stopResume = undefined;
  };

  socket.addEventListener("open", () => {
    interval = env.setInterval(ping, HEARTBEAT_INTERVAL_MS);
    stopResume = env.onResume?.(ping);
  });
  socket.addEventListener("message", clearDeadline);
  socket.addEventListener("close", stop);
  return stop;
}
