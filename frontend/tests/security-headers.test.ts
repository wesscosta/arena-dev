import assert from "node:assert/strict";
import test from "node:test";
import { browserSecurityHeaders } from "../lib/security-headers";

function header(name: string, api?: string, dev = false) {
  return browserSecurityHeaders(api, dev).find((item) => item.key === name)?.value ?? "";
}

test("11.4 CSP enforces default deny of frames, remote images and objects", () => {
  const policy = header("Content-Security-Policy", "https://api.arena.example.test");
  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /frame-src 'none'/);
  assert.match(policy, /img-src 'self' data: blob:/);
  assert.match(policy, /form-action 'self'/);
  assert.match(policy, /connect-src 'self' wss: https:\/\/api.arena.example.test wss:\/\/api.arena.example.test/);
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
