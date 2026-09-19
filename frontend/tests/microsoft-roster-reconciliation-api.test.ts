import assert from "node:assert/strict";
import test,{afterEach} from "node:test";
import {fetchRosterReconciliation,applyRosterReconciliation} from "../lib/microsoft-integration-api";

const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch});

test("loads reconciliation analysis",async()=>{
  globalThis.fetch=async(input)=>{
    assert.ok(String(input).endsWith("/reconciliation"));
    return new Response(JSON.stringify({
      connectionId:"c1",
      classroomLinkId:"l1",
      classroomId:"a1",
      microsoftClassId:"m1",
      items:[],
      inSync:2,
      remoteMissing:1,
      localInactive:0,
      brokenLinks:0
    }),{status:200,headers:{"Content-Type":"application/json"}});
  };
  const result=await fetchRosterReconciliation("c1","l1");
  assert.equal(result.remoteMissing,1);
});

test("applies supervised reconciliation action",async()=>{
  globalThis.fetch=async(input,init)=>{
    assert.ok(String(input).endsWith("/reconciliation/x1"));
    assert.equal(init?.method,"POST");
    const body=JSON.parse(String(init?.body));
    assert.equal(body.action,"DEACTIVATE_ENROLLMENT");
    return new Response(JSON.stringify({
      externalStudentLinkId:"x1",
      enrollmentId:"e1",
      studentId:"s1",
      studentName:"Maria",
      action:"DEACTIVATE_ENROLLMENT",
      enrollmentActive:false
    }),{status:200,headers:{"Content-Type":"application/json"}});
  };
  const result=await applyRosterReconciliation("c1","l1","x1","DEACTIVATE_ENROLLMENT");
  assert.equal(result.enrollmentActive,false);
});
