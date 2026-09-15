import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { fetchActivityRubric, gradeStructuredAssessment } from "../lib/assessment-rubric-api";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function mockCsrf() {
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "http://localhost:8080/api/auth/csrf") {
      return new Response(JSON.stringify({ token: "csrf" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.endsWith("/assessment/grade")) {
      assert.equal(init?.method, "POST");
      return new Response(JSON.stringify({
        assessmentId: "a1", submissionId: "s1", submissionStatus: "GRADED",
        awardedPoints: 8, maxPoints: 10, complete: true, criteria: [],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    throw new Error(`URL inesperada: ${url}`);
  };
}

test("loads rubric without mutating XP state", async () => {
  globalThis.fetch = async (input) => {
    assert.equal(String(input), "http://localhost:8080/api/activities/act-1/rubric");
    return new Response(JSON.stringify({ activityId: "act-1", maxPoints: 10, criteria: [] }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  };
  const rubric = await fetchActivityRubric("act-1");
  assert.equal(rubric.maxPoints, 10);
});

test("grading uses assessment endpoint and csrf protected teacher command", async () => {
  mockCsrf();
  const assessment = await gradeStructuredAssessment("act-1", "s1");
  assert.equal(assessment.submissionStatus, "GRADED");
});
