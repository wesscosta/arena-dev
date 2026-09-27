import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = readFileSync(resolve(process.cwd(), "lib/learning-resource-api.ts"), "utf8");

test("learning resource client exposes the complete teacher CRUD", () => {
  assert.match(api, /fetchLearningResources/);
  assert.match(api, /fetchLearningResource/);
  assert.match(api, /createLearningResource/);
  assert.match(api, /updateLearningResource/);
  assert.match(api, /deleteLearningResource/);
  assert.match(api, /\/api\/learning-resources/);
  assert.match(api, /method: "DELETE"/);
});

test("learning resource client keeps source provenance explicit", () => {
  assert.match(api, /LearningResourceSourceType/);
  assert.match(api, /"FILE"/);
  assert.match(api, /"NOTION"/);
  assert.match(api, /sourceLabel/);
});
