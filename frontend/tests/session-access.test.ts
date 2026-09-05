import assert from "node:assert/strict";
import test from "node:test";
import { isLoopbackBaseUrl, sessionJoinUrl } from "../lib/session-access";

test("builds the public join URL with a normalized code", () => {
  assert.equal(
    sessionJoinUrl("http://192.168.0.20:3000/", " ab12cd "),
    "http://192.168.0.20:3000/join?code=AB12CD",
  );
});

test("recognizes loopback hosts that should not be shared by QR code", () => {
  assert.equal(isLoopbackBaseUrl("http://localhost:3000"), true);
  assert.equal(isLoopbackBaseUrl("http://127.0.0.1:3000"), true);
  assert.equal(isLoopbackBaseUrl("http://[::1]:3000"), true);
  assert.equal(isLoopbackBaseUrl("http://192.168.0.20:3000"), false);
});
