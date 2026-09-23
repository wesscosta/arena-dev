import assert from "node:assert/strict";
import test,{afterEach} from "node:test";
import {fetchSubmissionTracking} from "../lib/microsoft-integration-api";

const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch});

test("loads submission tracking for mapped activity",async()=>{
  globalThis.fetch=async(input)=>{
    assert.ok(String(input).endsWith("/activity-links/x1/submissions"));
    return new Response(JSON.stringify({
      connectionId:"c1",
      classroomLinkId:"l1",
      activityLinkId:"x1",
      activityId:"a1",
      activityTitle:"Projeto API",
      microsoftAssignmentId:"m1",
      items:[],
      delivered:3,
      pending:2,
      excused:0,
      unmatched:0
    }),{status:200,headers:{"Content-Type":"application/json"}});
  };

  const result=await fetchSubmissionTracking("c1","l1","x1");
  assert.equal(result.delivered,3);
  assert.equal(result.pending,2);
});
