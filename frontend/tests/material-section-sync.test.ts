import assert from "node:assert/strict";
import test from "node:test";
import {
  reconcileStageVersion, flattenMaterialOutline, sectionNumber, renderedHeadingMatches,
} from "../lib/material-section-sync";
import { emptyLiveStageState } from "../lib/live-stage-api";
import type { ContentOutlineNode } from "../lib/learning-resource-api";

const outline: ContentOutlineNode[] = [
  { level: 1, title: "SQL", anchor: "sql", sectionPath: ["SQL"], children: [
    { level: 2, title: "Seleção", anchor: "selecao", sectionPath: ["SQL","Seleção"], children: [] },
    { level: 2, title: "Seleção", anchor: "selecao-2", sectionPath: ["SQL","Seleção"], children: [] },
  ] },
];

test("flatten canonical outline preserving duplicate anchors and nesting", () => {
  assert.deepEqual(flattenMaterialOutline(outline).map((item) => item.anchor), ["sql","selecao","selecao-2"]);
  assert.equal(sectionNumber(outline, "selecao-2"),2);
  assert.equal(sectionNumber(outline, null),-1);
  assert.equal(sectionNumber(outline, "invalid"),-1);
});

test("ignore old stage events across websocket and runtime snapshot reconciliation", () => {
  const base=emptyLiveStageState("session");
  const stage={...base,stageVersion:7,primary:{...base.primary,type:"MATERIAL" as const,
    sourceId:"publication",sectionAnchor:"selecao-2"}};
  const stale={...stage,stageVersion:6,primary:{...stage.primary,sectionAnchor:"sql"}};
  assert.equal(reconcileStageVersion(stage,stale).primary.sectionAnchor,"selecao-2");
  assert.equal(reconcileStageVersion(stale,stage).stageVersion,7);
  assert.equal(reconcileStageVersion(stage,{...base,sessionId:"new-session",stageVersion:0}).sessionId,"new-session");
});

test("text safety check avoids targeting unrelated DOM headings", () => {
  assert.equal(renderedHeadingMatches("Seleção", "Seleção"),true);
  assert.equal(renderedHeadingMatches("**SELECT**", "SELECT"),true);
  assert.equal(renderedHeadingMatches("WHERE", "SELECT"),false);
});
