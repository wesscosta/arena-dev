import assert from "node:assert/strict";
import test from "node:test";
import {deriveIntegrationOperationState} from "../lib/integration-operations";

test("prioritizes connection",()=>{
  assert.equal(deriveIntegrationOperationState({connectionActive:false,linkedClassrooms:0,classroomInspected:false,pendingStudentMatches:null,unmappedActivities:null,deliveredSubmissions:null,importedSubmissions:null}).stage,"CONNECTION");
});

test("prioritizes student review before activities",()=>{
  const state=deriveIntegrationOperationState({connectionActive:true,linkedClassrooms:1,classroomInspected:true,pendingStudentMatches:3,unmappedActivities:4,deliveredSubmissions:5,importedSubmissions:1});
  assert.equal(state.stage,"STUDENTS");
  assert.match(state.detail,/3 aluno/);
});

test("surfaces pending submissions",()=>{
  const state=deriveIntegrationOperationState({connectionActive:true,linkedClassrooms:1,classroomInspected:true,pendingStudentMatches:0,unmappedActivities:0,deliveredSubmissions:6,importedSubmissions:4});
  assert.equal(state.stage,"SUBMISSIONS");
});

test("marks operation healthy",()=>{
  assert.equal(deriveIntegrationOperationState({connectionActive:true,linkedClassrooms:1,classroomInspected:true,pendingStudentMatches:0,unmappedActivities:0,deliveredSubmissions:4,importedSubmissions:4}).stage,"HEALTHY");
});
