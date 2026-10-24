import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manager = readFileSync("components/JourneyManager.tsx", "utf8");
const api = readFileSync("lib/journey-api.ts", "utf8");
test("teacher can change release count without mutating Journey structure", () => {
  assert.match(api, /changeJourneyRelease/);
  assert.match(api, /method: "PATCH"/);
  assert.match(manager, /Liberação gradual/);
  assert.match(manager, /Aplicar liberação/);
  assert.match(manager, /setReleaseInput/);
  assert.match(manager, /progresso salvo/);
});
