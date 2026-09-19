import assert from "node:assert/strict";
import test,{afterEach} from "node:test";
import {publishMicrosoftSubmissionOutcome} from "../lib/microsoft-integration-api";

const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch});

test("publishes local assessment to Microsoft only through explicit command",async()=>{
  globalThis.fetch=async(input,init)=>{
    if(String(input).endsWith("/api/auth/csrf")){
      return new Response(JSON.stringify({token:"test-csrf-token"}),{
        status:200,
        headers:{"Content-Type":"application/json"}
      });
    }

    assert.ok(String(input).endsWith("/submissions/sub-1/outcomes/publish"));
    assert.equal(init?.method,"POST");

    const body=JSON.parse(String(init?.body));
    assert.equal(body.action,"PUSH_ASSESSMENT");

    return new Response(JSON.stringify({
      localSubmissionId:"local-sub-1",
      microsoftSubmissionId:"sub-1",
      action:"PUSH_ASSESSMENT",
      pointsSent:8.5,
      feedbackSent:true,
      returnedToStudent:false
    }),{status:200,headers:{"Content-Type":"application/json"}});
  };

  const result=await publishMicrosoftSubmissionOutcome(
    "c1","cl1","a1","sub-1","PUSH_ASSESSMENT",
  );

  assert.equal(result.pointsSent,8.5);
  assert.equal(result.feedbackSent,true);
  assert.equal(result.returnedToStudent,false);
});
