/**
 * Enforced browser boundary for all Next.js HTML/routes.
 *
 * Next.js 16 currently injects inline bootstrap/hydration scripts and the
 * theme bootstrap is inline. 'unsafe-inline' is TEMPORARY and does not
 * eliminate all inline-XSS risk. 11.4 blocks external script injection,
 * frames/objects, external image beacons and unexpected form destinations.
 * A nonce-based dynamic rendering migration is a separate release gate.
 * v0.11.0-rc.3: connect-src names the serving host instead of any wss:.
 */
// Host header as sent by the browser: DNS name, IPv4 or bracketed IPv6, optional port.
const REQUEST_HOST = /^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)*|\[[0-9a-f:.]+\])(?::\d{1,5})?$/i;

/**
 * WebSocket origins of the host that served the page. The realtime client
 * connects to the page origin (/ws is proxied by Next.js), so the policy names
 * that exact host instead of allowing any wss: destination. Some WebKit
 * versions do not treat ws/wss as implied by 'self', hence the explicit entry.
 */
export function sameHostWebSocketOrigins(requestHost?: string | null) {
  if (!requestHost || !REQUEST_HOST.test(requestHost)) return [];
  const host = requestHost.toLowerCase();
  return [`ws://${host}`, `wss://${host}`];
}

export function contentSecurityPolicy(configuredApiUrl?: string, development = false, requestHost?: string | null) {
  const endpoints = new Set<string>(sameHostWebSocketOrigins(requestHost));
  try {
    if (configuredApiUrl) {
      const parsed = new URL(configuredApiUrl);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        endpoints.add(parsed.origin);
        const webSocket = new URL(parsed.origin);
        webSocket.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
        endpoints.add(webSocket.origin);
      }
    }
  } catch {
    // Never interpolate an untrusted, invalid configured origin into CSP.
  }
  if (development) {
    endpoints.add("http://localhost:8080");
    endpoints.add("ws://localhost:8080");
    endpoints.add("http://127.0.0.1:8080");
    endpoints.add("ws://127.0.0.1:8080");
  }
  const connections = ["'self'", ...endpoints].join(" ");
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'" + (development ? " 'unsafe-eval'" : ""),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connections}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];
  return directives.join("; ");
}

/** Static headers for every route. The CSP is per request, set by proxy.ts. */
export function browserSecurityHeaders() {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ];
}
