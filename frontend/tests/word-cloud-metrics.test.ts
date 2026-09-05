import assert from "node:assert/strict";
import test from "node:test";
import { wordCloudParticipationMetrics } from "../lib/word-cloud-metrics";

test("derives pending students from present students and unique responders", () => {
  assert.deepEqual(
    wordCloudParticipationMetrics(15, 9, 18),
    {
      presentCount: 15,
      answeredCount: 9,
      pendingCount: 6,
      submissionCount: 18,
    },
  );
});

test("never exposes a negative pending count", () => {
  assert.deepEqual(
    wordCloudParticipationMetrics(2, 3, 5),
    {
      presentCount: 2,
      answeredCount: 3,
      pendingCount: 0,
      submissionCount: 5,
    },
  );
});
