import assert from "node:assert/strict";
import test from "node:test";
import { saveJourneyContentsToLibrary } from "../lib/journey-api";

test("saving a Journey to the Library posts to its library-export endpoint", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ created: 2, alreadyInLibrary: 1, withoutContent: 0, createdIds: ["a", "b"] }),
      { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    const result = await saveJourneyContentsToLibrary("journey/1");
    assert.equal(result.created, 2);
    const call = calls.find((item) => item.url.includes("/library-export"));
    assert.ok(call, "library-export request sent");
    assert.match(call.url, /\/api\/journeys\/journey%2F1\/library-export$/);
    assert.equal(call.init?.method, "POST");
  } finally {
    globalThis.fetch = original;
  }
});
