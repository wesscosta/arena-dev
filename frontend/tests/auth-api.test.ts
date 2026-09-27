import assert from "node:assert/strict";
import test from "node:test";
import { apiFetch } from "../lib/auth-api";

test("apiFetch lets the browser provide multipart boundaries for FormData", async () => {
  let requestHeaders: Headers | undefined;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/auth/csrf")) {
      return new Response(JSON.stringify({ token: "csrf-test" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    requestHeaders = new Headers(init?.headers);
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const form = new FormData();
  form.append("classroomId", "classroom-1");
  form.append("file", new Blob(["conteudo"], { type: "text/plain" }), "material.txt");

  await apiFetch("/api/content-ingestion/file-preview", { method: "POST", body: form });

  assert.equal(requestHeaders?.has("Content-Type"), false);
  assert.equal(requestHeaders?.get("X-XSRF-TOKEN"), "csrf-test");
});
