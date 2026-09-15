import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { publishAssessmentFeedback, saveAssessmentFeedbackDraft } from "../lib/assessment-feedback-api";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function installMock(expectedSuffix: string, expectedMethod: string, body?: unknown) {
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "http://localhost:8080/api/auth/csrf") {
      return new Response(JSON.stringify({ token: "csrf" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    assert.ok(url.endsWith(expectedSuffix));
    assert.equal(init?.method, expectedMethod);
    if (body !== undefined) assert.deepEqual(JSON.parse(String(init?.body)), body);
    return new Response(JSON.stringify({
      assessmentId: "a1", submissionId: "s1", submissionStatus: "GRADED",
      feedbackDraft: "Bom trabalho.",
      publishedFeedback: expectedSuffix.endsWith("/publish") ? "Bom trabalho." : null,
      publishedAt: expectedSuffix.endsWith("/publish") ? "2026-09-14T20:00:00Z" : null,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
}

test("saves supervised feedback draft", async () => {
  installMock("/assessment/feedback/draft", "PUT", { feedback: "Bom trabalho." });
  const result = await saveAssessmentFeedbackDraft("act-1", "s1", "Bom trabalho.");
  assert.equal(result.feedbackDraft, "Bom trabalho.");
});

test("publishes feedback only through explicit teacher command", async () => {
  installMock("/assessment/feedback/publish", "POST");
  const result = await publishAssessmentFeedback("act-1", "s1");
  assert.equal(result.publishedFeedback, "Bom trabalho.");
});
