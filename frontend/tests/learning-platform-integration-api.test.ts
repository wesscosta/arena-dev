
import assert from "node:assert/strict";
import test,{afterEach} from "node:test";
import {fetchIntegrationOverview} from "../lib/learning-platform-integration-api";
const originalFetch=globalThis.fetch; afterEach(()=>{globalThis.fetch=originalFetch});
test("loads provider readiness without requiring adapter",async()=>{globalThis.fetch=async(input)=>{assert.ok(String(input).endsWith("/api/activities/a1/integrations")); return new Response(JSON.stringify({activityId:"a1",activityTitle:"Atividade",providers:[{provider:"TEAMS",adapterConfigured:false,linked:false,externalClassId:null,externalAssignmentId:null,externalWebUrl:null}]}),{status:200,headers:{"Content-Type":"application/json"}})}; const result=await fetchIntegrationOverview("a1"); assert.equal(result.providers[0].adapterConfigured,false)});
