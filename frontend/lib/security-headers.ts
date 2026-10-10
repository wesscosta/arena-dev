/**
 * Enforced browser boundary for all Next.js HTML/routes.
 *
 * Next.js 16 currently injects inline bootstrap/hydration scripts and the
 * theme bootstrap is inline. 'unsafe-inline' is TEMPORARY and does not
 * eliminate all inline-XSS risk. 11.4 blocks external script injection,
 * frames/objects, external image beacons and unexpected form destinations.
 * A nonce-based dynamic rendering migration is a separate release gate.
 */
export function browserSecurityHeaders(configuredApiUrl?: string, development = false) {
  const endpoints = new Set<string>();
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
  // Some WebKit versions do not treat wss as implied by 'self' on HTTPS.
  const connections = ["'self'", "wss:", ...endpoints].join(" ");
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
  return [
    { key: "Content-Security-Policy", value: directives.join("; ") },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ];
}
