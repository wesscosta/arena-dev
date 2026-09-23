import assert from "node:assert/strict";
import test,{afterEach} from "node:test";
import {fetchMicrosoftSubmissionOutcome} from "../lib/microsoft-integration-api";

const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch});

test("loads Microsoft points and feedback preview",async()=>{
  globalThis.fetch=async(input)=>{
    assert.ok(String(input).endsWith("/submissions/sub-1/outcomes"));
    return new Response(JSON.stringify({
      connectionId:"c1",
      classroomLinkId:"cl1",
      activityLinkId:"a1",
      localSubmissionId:"local-sub-1",
      microsoftSubmissionId:"sub-1",
      points:8.5,
      publishedPoints:8,
      feedback:"Bom trabalho. Revise os testes.",
      publishedFeedback:"Bom trabalho.",
      lastModifiedDateTime:"2026-09-19T18:05:00Z",
      empty:false
    }),{status:200,headers:{"Content-Type":"application/json"}});
  };

  const result=await fetchMicrosoftSubmissionOutcome("c1","cl1","a1","sub-1");
  assert.equal(result.points,8.5);
  assert.equal(result.feedback,"Bom trabalho. Revise os testes.");
  assert.equal(result.localSubmissionId,"local-sub-1");
});
