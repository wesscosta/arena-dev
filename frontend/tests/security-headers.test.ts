import assert from "node:assert/strict";
import test from "node:test";
import { browserSecurityHeaders, contentSecurityPolicy, sameHostWebSocketOrigins } from "../lib/security-headers";

function header(name: string, api?: string, dev = false, host?: string) {
  if (name === "Content-Security-Policy") return contentSecurityPolicy(api, dev, host);
  return browserSecurityHeaders().find((item) => item.key === name)?.value ?? "";
}

test("11.4 CSP enforces default deny of frames, remote images and objects", () => {
  const policy = header("Content-Security-Policy", "https://api.arena.example.test");
  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /frame-src 'none'/);
  assert.match(policy, /img-src 'self' data: blob:/);
  assert.match(policy, /form-action 'self'/);
  assert.match(policy, /connect-src 'self' https:\/\/api.arena.example.test wss:\/\/api.arena.example.test/);
  assert.doesNotMatch(policy, /unsafe-eval/);
  assert.doesNotMatch(policy, /img-src[^;]*https:/);
});

test("11.4 restrictive browser security response headers", () => {
  assert.equal(header("X-Frame-Options"), "DENY");
  assert.equal(header("X-Content-Type-Options"), "nosniff");
  assert.equal(header("Referrer-Policy"), "no-referrer");
  assert.match(header("Permissions-Policy"), /microphone=\(\)/);
});

test("11.4 configured API URLs cannot inject directives", () => {
  const policy = header("Content-Security-Policy", "malformed URL; img-src *");
  assert.doesNotMatch(policy, /img-src \*/);
  assert.match(policy, /img-src 'self'/);
});

test("11.4 development policy permits local backend/WebSocket but production does not permit eval", () => {
  const dev = header("Content-Security-Policy", "http://localhost:8080", true);
  assert.match(dev, /ws:\/\/localhost:8080/);
  assert.match(dev, /unsafe-eval/);
  const production = header("Content-Security-Policy", "http://localhost:8080", false);
  assert.doesNotMatch(production, /unsafe-eval/);
});

test("rc.3 connect-src allows WebSockets only to the serving host, never any wss:", () => {
  const policy = header("Content-Security-Policy", undefined, false, "192.168.0.10:3000");
  const connect = policy.split("; ").find((item) => item.startsWith("connect-src")) ?? "";
  assert.equal(connect, "connect-src 'self' ws://192.168.0.10:3000 wss://192.168.0.10:3000");
  assert.doesNotMatch(policy, /(^|\s)wss:(\s|;|$)/);
});

test("rc.3 malformed Host headers never reach the policy", () => {
  for (const host of ["evil.test; script-src *", "a b", "host:99999999", "", null]) {
    assert.deepEqual(sameHostWebSocketOrigins(host), [], String(host));
  }
  assert.deepEqual(sameHostWebSocketOrigins("Arena.Example.test"), ["ws://arena.example.test", "wss://arena.example.test"]);
  assert.deepEqual(sameHostWebSocketOrigins("[::1]:3000"), ["ws://[::1]:3000", "wss://[::1]:3000"]);
  const policy = header("Content-Security-Policy", undefined, false, "evil.test; script-src *");
  assert.doesNotMatch(policy, /script-src \*/);
});

test("rc.3 the static header set carries no CSP (it is per request)", () => {
  assert.equal(browserSecurityHeaders().some((item) => item.key === "Content-Security-Policy"), false);
});
