import assert from "node:assert/strict";
import test,{afterEach} from "node:test";
import {importMicrosoftSubmission} from "../lib/microsoft-integration-api";

const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch});

test("imports one supervised Microsoft submission",async()=>{
  globalThis.fetch=async(input,init)=>{
    if(String(input).endsWith("/api/auth/csrf")){
      return new Response(JSON.stringify({token:"test-csrf-token"}),{
        status:200,
        headers:{"Content-Type":"application/json"}
      });
    }
    assert.ok(String(input).endsWith("/submissions/import"));
    assert.equal(init?.method,"POST");
    const body=JSON.parse(String(init?.body));
    assert.equal(body.microsoftSubmissionId,"ms-sub-1");
    return new Response(JSON.stringify({
      submissionId:"s1",
      externalSubmissionLinkId:"x1",
      microsoftSubmissionId:"ms-sub-1",
      activityId:"a1",
      enrollmentId:"e1",
      attemptNumber:1,
      source:"EXTERNAL",
      status:"SUBMITTED",
      submittedAt:"2026-09-19T18:00:00Z",
      changed:true
    }),{status:200,headers:{"Content-Type":"application/json"}});
  };

  const result=await importMicrosoftSubmission("c1","l1","a1","ms-sub-1");
  assert.equal(result.changed,true);
  assert.equal(result.source,"EXTERNAL");
  assert.equal(result.status,"SUBMITTED");
});
