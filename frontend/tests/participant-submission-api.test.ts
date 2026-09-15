import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { fetchParticipantActivities, startParticipantActivity } from "../lib/participant-submission-api";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("student activities use the opaque participant token without teacher csrf", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://localhost:8080/api/join/ABC123/activities");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("X-Participant-Token"), "participant-token");
    assert.equal(init?.credentials, "omit");
    return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
  };
  assert.deepEqual(await fetchParticipantActivities("ABC123", "participant-token"), []);
});

test("student can start one activity through the participant route", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://localhost:8080/api/join/ABC123/activities/act-1/start");
    assert.equal(init?.method, "POST");
    return new Response(JSON.stringify({ id: "act-1", title: "Projeto", questions: [], submissionId: "sub-1", submissionStatus: "IN_PROGRESS", items: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const activity = await startParticipantActivity("ABC123", "participant-token", "act-1");
  assert.equal(activity.submissionStatus, "IN_PROGRESS");
});
