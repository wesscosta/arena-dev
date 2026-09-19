import assert from "node:assert/strict";
import test,{afterEach} from "node:test";
import {applyStudentMatch} from "../lib/microsoft-integration-api";

const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch});

test("posts supervised student match action",async()=>{
  globalThis.fetch=async(input,init)=>{
    assert.ok(String(input).endsWith("/student-match-apply"));
    assert.equal(init?.method,"POST");
    const body=JSON.parse(String(init?.body));
    assert.equal(body.microsoftUserId,"ms-1");
    assert.equal(body.action,"APPLY_SUGGESTED");
    return new Response(JSON.stringify({
      microsoftUserId:"ms-1",
      studentId:"s1",
      enrollmentId:"e1",
      externalStudentLinkId:"x1",
      studentName:"Maria",
      action:"APPLY_SUGGESTED",
      changed:true
    }),{status:200,headers:{"Content-Type":"application/json"}});
  };

  const result=await applyStudentMatch("c1","l1",{
    microsoftUserId:"ms-1",
    action:"APPLY_SUGGESTED"
  });

  assert.equal(result.changed,true);
  assert.equal(result.studentId,"s1");
});
