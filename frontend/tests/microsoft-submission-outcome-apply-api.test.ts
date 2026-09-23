import assert from "node:assert/strict";
import test,{afterEach} from "node:test";
import {applyMicrosoftSubmissionOutcome} from "../lib/microsoft-integration-api";

const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch});

test("applies external feedback through explicit supervised command",async()=>{
  globalThis.fetch=async(input,init)=>{
    if(String(input).endsWith("/api/auth/csrf")){
      return new Response(JSON.stringify({token:"test-csrf-token"}),{
        status:200,
        headers:{"Content-Type":"application/json"}
      });
    }

    assert.ok(String(input).endsWith("/submissions/sub-1/outcomes/apply"));
    assert.equal(init?.method,"POST");

    const body=JSON.parse(String(init?.body));
    assert.equal(body.action,"APPLY_FEEDBACK_DRAFT");

    return new Response(JSON.stringify({
      localSubmissionId:"local-sub-1",
      assessmentId:"assessment-1",
      microsoftSubmissionId:"sub-1",
      action:"APPLY_FEEDBACK_DRAFT",
      submissionStatus:"UNDER_REVIEW",
      feedbackDraft:"Feedback Teams",
      awardedPoints:null,
      maxPoints:null,
      changed:true
    }),{status:200,headers:{"Content-Type":"application/json"}});
  };

  const result=await applyMicrosoftSubmissionOutcome(
    "c1",
    "cl1",
    "a1",
    "sub-1",
    "APPLY_FEEDBACK_DRAFT",
  );

  assert.equal(result.feedbackDraft,"Feedback Teams");
  assert.equal(result.submissionStatus,"UNDER_REVIEW");
  assert.equal(result.changed,true);
});
