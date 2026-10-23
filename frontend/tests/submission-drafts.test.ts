import test from "node:test";
import assert from "node:assert/strict";
import { persistChangedQuestionDrafts } from "../lib/submission-drafts";

test("skips unchanged answers and saves changed drafts in order", async () => {
  const saved = new Map([["1", "old"], ["2", "ok"]]);
  const calls: string[] = [];
  await persistChangedQuestionDrafts(
    [{ id: "1" }, { id: "2" }, { id: "3" }],
    { "q:1": "new", "q:2": "ok", "q:3": "last" },
    (id) => saved.get(id) ?? "",
    async (q, value) => { calls.push(q.id + ":" + value); saved.set(q.id, value); },
  );
  assert.deepEqual(calls, ["1:new", "3:last"]);
});

test("failed persistence rejects and prevents later writes or submission", async () => {
  const calls: string[] = [];
  await assert.rejects(
    persistChangedQuestionDrafts(
      [{ id: "1" }, { id: "2" }],
      { "q:1": "a", "q:2": "b" },
      () => "",
      async (q) => { calls.push(q.id); if (q.id === "1") throw new Error("network down"); },
    ),
    /network down/,
  );
  assert.deepEqual(calls, ["1"]);
});

test("retry succeeds once backend becomes reachable", async () => {
  const saved = new Map<string, string>();
  let fail = true;
  const task = () => persistChangedQuestionDrafts(
    [{ id: "1" }], { "q:1": "answer" },
    (id) => saved.get(id) ?? "",
    async (q, value) => { if (fail) throw new Error("offline"); saved.set(q.id, value); },
  );
  await assert.rejects(task(), /offline/);
  fail = false;
  await task();
  assert.equal(saved.get("1"), "answer");
});
