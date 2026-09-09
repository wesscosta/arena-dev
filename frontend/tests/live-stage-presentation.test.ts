import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectorSource = readFileSync(
  resolve(process.cwd(), "components/ProjectorView.tsx"),
  "utf8",
);
const joinSource = readFileSync(
  resolve(process.cwd(), "app/join/page.tsx"),
  "utf8",
);
const stageContract = readFileSync(
  resolve(process.cwd(), "lib/live-stage-api.ts"),
  "utf8",
);

test("projector renders prepared slide and question stage payloads", () => {
  assert.match(projectorSource, /primaryType === "SLIDE"/);
  assert.match(projectorSource, /primaryType === "QUESTION"/);
  assert.match(projectorSource, /preparedStep\.slideContent/);
  assert.match(projectorSource, /preparedStep\.question\.statement/);
});

test("participant view renders question but does not render projector-only slide", () => {
  assert.match(joinSource, /liveStage\.primary\.type === "QUESTION"/);
  assert.match(joinSource, /liveStage\.primary\.step\?\.question/);
  assert.doesNotMatch(joinSource, /liveStage\.primary\.type === "SLIDE"/);
});

test("public stage question contract excludes answer and explanation fields", () => {
  const questionContract = stageContract.slice(
    stageContract.indexOf("question?: {"),
    stageContract.indexOf("} | null;", stageContract.indexOf("question?: {")),
  );
  assert.doesNotMatch(questionContract, /answer/i);
  assert.doesNotMatch(questionContract, /explanation/i);
  assert.match(questionContract, /statement: string/);
  assert.match(questionContract, /options: Array/);
});
