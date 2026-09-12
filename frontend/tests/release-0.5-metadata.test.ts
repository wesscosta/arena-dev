import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "..");
const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as { version: string };
const lock = JSON.parse(readFileSync(resolve(process.cwd(), "package-lock.json"), "utf8")) as {
  version: string;
  packages: Record<string, { version?: string }>;
};
const pom = readFileSync(resolve(root, "backend/pom.xml"), "utf8");
const metadata = readFileSync(resolve(root, "scripts/release/check-metadata.sh"), "utf8");
const gate = readFileSync(resolve(root, "scripts/release/release-gate.sh"), "utf8");
const verifier = readFileSync(resolve(root, "scripts/release/verify-backup.sh"), "utf8");

test("v0.5 release manifests are aligned", () => {
  assert.equal(pkg.version, "0.5.0");
  assert.equal(lock.version, "0.5.0");
  assert.equal(lock.packages[""]?.version, "0.5.0");
  assert.match(pom, /<artifactId>arena-dev-api<\/artifactId>\s*<version>0\.5\.0<\/version>/);
  assert.match(metadata, /ARENA_RELEASE_VERSION:-0\.5\.0/);
  assert.match(gate, /ARENA_RELEASE_VERSION:-0\.5\.0/);
});

test("v0.5 backup verifier requires Flyway V16 and Quiz persistence", () => {
  assert.match(verifier, /esperado 16/);
  assert.match(verifier, /quiz_rounds/);
  assert.match(verifier, /quiz_participant_answers/);
  assert.match(verifier, /evaluated_at/);
  assert.match(verifier, /score_event_id/);
});
