import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { prepareBatchAiSuggestions } from "../lib/assessment-batch-api";
const originalFetch=globalThis.fetch; afterEach(()=>{globalThis.fetch=originalFetch;});
test("prepares batch suggestions without publishing",async()=>{globalThis.fetch=async(input,init)=>{const url=String(input);if(url==="http://localhost:8080/api/auth/csrf")return new Response(JSON.stringify({token:"csrf"}),{status:200,headers:{"Content-Type":"application/json"}});assert.ok(url.endsWith("/api/activities/act-1/assessment/batch/ai-suggestions"));assert.equal(init?.method,"POST");assert.deepEqual(JSON.parse(String(init?.body)),{submissionIds:["s1","s2"]});return new Response(JSON.stringify({requested:2,succeeded:2,failed:0,items:[]}),{status:200,headers:{"Content-Type":"application/json"}});};const r=await prepareBatchAiSuggestions("act-1",["s1","s2"]);assert.equal(r.succeeded,2);});
