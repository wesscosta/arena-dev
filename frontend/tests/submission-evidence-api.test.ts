import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { fetchSubmissionEvidence } from "../lib/submission-evidence-api";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("loads process evidence without turning it into a verdict", async () => {
  globalThis.fetch = async (input) => {
    assert.ok(String(input).endsWith("/api/activities/a1/submissions/s1/evidence"));
    return new Response(JSON.stringify({
      submissionId: "s1",
      attemptNumber: 1,
      startedAt: null,
      submittedAt: null,
      durationSeconds: 0,
      saveCount: 2,
      pasteCount: 1,
      pastedCharacters: 120,
      highestSimilarity: null,
      recommendation: "LOW",
      reasons: [],
      events: [],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const evidence = await fetchSubmissionEvidence("a1", "s1");
  assert.equal(evidence.recommendation, "LOW");
  assert.equal(evidence.pasteCount, 1);
});
