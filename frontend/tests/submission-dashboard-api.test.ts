
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { fetchSubmissionDashboard } from "../lib/submission-dashboard-api";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("loads the teacher submission dashboard from the activity route", async () => {
  globalThis.fetch = async (input) => {
    assert.equal(String(input), "http://localhost:8080/api/activities/activity-1/submissions/dashboard");
    return new Response(JSON.stringify({ activityId: "activity-1", activityTitle: "Projeto", classroomId: "classroom-1", summary: { total: 2, notStarted: 1, inProgress: 0, submitted: 1, underReview: 0, graded: 0, returned: 0 }, students: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const dashboard = await fetchSubmissionDashboard("activity-1");
  assert.equal(dashboard.summary.total, 2);
  assert.equal(dashboard.summary.submitted, 1);
});
