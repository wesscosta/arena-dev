import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "components/MicrosoftIntegrationConsole.tsx"),
  "utf8",
);

test("observability exposes recent execution drill-down", () => {
  assert.match(source, /integration-observability-history/);
  assert.match(source, /Execuções recentes/);
  assert.match(source, /execution\.failures\.map/);
  assert.match(source, /Resumo da falha/);
});

test("observability is refreshed independently from classroom links", () => {
  assert.match(source, /async function refreshObservability/);
  assert.doesNotMatch(
    source,
    /Promise\.all\(\[fetchClassroomLinks\(connectionId\), fetchIntegrationObservability\(connectionId\)\]\)/,
  );
});
