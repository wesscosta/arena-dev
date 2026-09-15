import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { applyAiAssessmentSuggestion, generateAiAssessmentSuggestion } from "../lib/assessment-ai-api";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function mockCsrfAndApi(expectedSuffix: string, responseBody: unknown) {
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "http://localhost:8080/api/auth/csrf") {
      return new Response(JSON.stringify({ token: "csrf" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    assert.ok(url.endsWith(expectedSuffix));
    assert.equal(init?.method, "POST");
    return new Response(JSON.stringify(responseBody), { status: 200, headers: { "Content-Type": "application/json" } });
  };
}

test("generates a supervised AI suggestion without grading the submission", async () => {
  mockCsrfAndApi("/assessment/ai-suggestions", {
    suggestionId: "ai-1", provider: "OPENAI", model: "gpt-test", promptVersion: "14.6-v1",
    summaryFeedback: "Sugestão", createdAt: "2026-09-14T20:00:00Z", fullyApplied: false, criteria: [],
  });
  const result = await generateAiAssessmentSuggestion("act-1", "sub-1");
  assert.equal(result.fullyApplied, false);
});

test("applying AI suggestion updates the teacher draft but does not publish", async () => {
  mockCsrfAndApi("/assessment/ai-suggestions/ai-1/apply", {
    assessmentId: "a1", submissionId: "sub-1", submissionStatus: "UNDER_REVIEW",
    awardedPoints: 8, maxPoints: 10, complete: true, criteria: [],
  });
  const result = await applyAiAssessmentSuggestion("act-1", "sub-1", "ai-1");
  assert.equal(result.submissionStatus, "UNDER_REVIEW");
});
