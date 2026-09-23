import assert from "node:assert/strict";
import test,{afterEach} from "node:test";
import {fetchIntegrationObservability} from "../lib/integration-observability-api";
const originalFetch=globalThis.fetch; afterEach(()=>{globalThis.fetch=originalFetch});
test("loads integration observability",async()=>{
  globalThis.fetch=async()=>new Response(JSON.stringify({connectionId:"c1",health:"ATTENTION",recentExecutions:2,failedExecutions:0,partialExecutions:1,runningExecutions:0,failedItems:1,lastSuccessAt:null,executions:[]}),{status:200,headers:{"Content-Type":"application/json"}});
  const result=await fetchIntegrationObservability("c1");
  assert.equal(result.health,"ATTENTION"); assert.equal(result.failedItems,1);
});
