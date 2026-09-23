import assert from "node:assert/strict";
import test,{afterEach} from "node:test";
import {discoverGoogleCourses,fetchGoogleReadiness,startGoogleOAuth} from "../lib/google-integration-api";
const originalFetch=globalThis.fetch; afterEach(()=>{globalThis.fetch=originalFetch});
test("Google readiness",async()=>{globalThis.fetch=async()=>new Response(JSON.stringify({provider:"GOOGLE_CLASSROOM",delegatedOAuthConfigured:true}),{status:200,headers:{"Content-Type":"application/json"}}); assert.equal((await fetchGoogleReadiness()).delegatedOAuthConfigured,true);});
test("Google OAuth start",async()=>{globalThis.fetch=async()=>new Response(JSON.stringify({authorizationUrl:"https://accounts.google.com/o/oauth2/v2/auth"}),{status:200,headers:{"Content-Type":"application/json"}}); assert.match((await startGoogleOAuth()).authorizationUrl,/accounts\.google\.com/);});
test("Google course discovery",async()=>{globalThis.fetch=async()=>new Response(JSON.stringify({connectionId:"g1",connectionName:"Google",count:1,courses:[{id:"c1",name:"TDS"}]}),{status:200,headers:{"Content-Type":"application/json"}}); assert.equal((await discoverGoogleCourses("g1")).courses[0]?.name,"TDS");});
