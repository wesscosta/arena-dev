import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { openSubmissionReview, saveSubmissionReviewNotes } from "../lib/submission-review-api";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const payload = {
  submissionId: "sub-1",
  activityId: "act-1",
  activityTitle: "Projeto",
  enrollmentId: "e-1",
  studentId: "s-1",
  studentName: "Ana",
  displayName: "Ana",
  status: "UNDER_REVIEW",
  attemptNumber: 1,
  submittedAt: "2026-09-14T12:00:00Z",
  items: [],
  questions: [],
  assessmentId: "a-1",
  teacherNotes: null,
  assessmentUpdatedAt: "2026-09-14T12:10:00Z",
};

function mockCsrfAndApi(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> | Response,
) {
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "http://localhost:8080/api/auth/csrf") {
      return new Response(JSON.stringify({ token: "csrf-test-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return handler(input, init);
  };
}

test("opens review and moves submitted work into teacher review", async () => {
  mockCsrfAndApi(async (input, init) => {
    assert.equal(
      String(input),
      "http://localhost:8080/api/activities/act-1/submissions/sub-1/review/open",
    );
    assert.equal(init?.method, "POST");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("X-XSRF-TOKEN"), "csrf-test-token");
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const review = await openSubmissionReview("act-1", "sub-1");
  assert.equal(review.status, "UNDER_REVIEW");
});

test("saves private teacher notes as assessment draft", async () => {
  mockCsrfAndApi(async (input, init) => {
    assert.equal(
      String(input),
      "http://localhost:8080/api/activities/act-1/submissions/sub-1/review/notes",
    );
    assert.equal(init?.method, "PUT");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("X-XSRF-TOKEN"), "csrf-test-token");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      teacherNotes: "Rever cardinalidade.",
    });
    return new Response(
      JSON.stringify({ ...payload, teacherNotes: "Rever cardinalidade." }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const review = await saveSubmissionReviewNotes(
    "act-1",
    "sub-1",
    "Rever cardinalidade.",
  );
  assert.equal(review.teacherNotes, "Rever cardinalidade.");
});
