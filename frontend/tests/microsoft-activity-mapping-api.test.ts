import assert from "node:assert/strict";
import test,{afterEach} from "node:test";
import {fetchActivityMapping,linkMicrosoftAssignment} from "../lib/microsoft-integration-api";

const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch});

test("loads activity mapping discovery",async()=>{
  globalThis.fetch=async(input)=>{
    assert.ok(String(input).endsWith("/activity-mapping"));
    return new Response(JSON.stringify({
      connectionId:"c1",
      classroomLinkId:"l1",
      classroomId:"a1",
      microsoftClassId:"m1",
      assignments:[],
      localActivities:[],
      mappings:[]
    }),{status:200,headers:{"Content-Type":"application/json"}});
  };
  const result=await fetchActivityMapping("c1","l1");
  assert.equal(result.mappings.length,0);
});

test("links local activity to Microsoft assignment",async()=>{
  globalThis.fetch=async(input,init)=>{
    assert.ok(String(input).endsWith("/activity-mapping"));
    assert.equal(init?.method,"POST");
    const body=JSON.parse(String(init?.body));
    assert.equal(body.activityId,"a1");
    assert.equal(body.microsoftAssignmentId,"m1");
    return new Response(JSON.stringify({
      id:"x1",
      activityId:"a1",
      microsoftAssignmentId:"m1",
      externalWebUrl:null
    }),{status:200,headers:{"Content-Type":"application/json"}});
  };
  const result=await linkMicrosoftAssignment("c1","l1",{
    activityId:"a1",
    microsoftAssignmentId:"m1"
  });
  assert.equal(result.id,"x1");
});
