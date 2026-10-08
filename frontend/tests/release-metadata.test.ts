import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "..");
const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
  version: string;
};
const lock = JSON.parse(
  readFileSync(resolve(process.cwd(), "package-lock.json"), "utf8"),
) as { version: string; packages: Record<string, { version?: string }> };
const pom = readFileSync(resolve(root, "backend/pom.xml"), "utf8");
const metadata = readFileSync(resolve(root, "scripts/release/check-metadata.sh"), "utf8");
const gate = readFileSync(resolve(root, "scripts/release/release-gate.sh"), "utf8");
const verifier = readFileSync(resolve(root, "scripts/release/verify-backup.sh"), "utf8");
const v08Contract = readFileSync(
  resolve(root, "scripts/release/verify-v0.8-contract.sh"),
  "utf8",
);
const v09Contract = readFileSync(
  resolve(root, "scripts/release/verify-v0.9-contract.sh"),
  "utf8",
);
const license = readFileSync(resolve(root, "LICENSE"), "utf8");
const licensingHistory = readFileSync(resolve(root, "LICENSING_HISTORY.md"), "utf8");

function backendVersion(): string {
  const match = pom.match(
    /<artifactId>arena-dev-api<\/artifactId>\s*<version>([^<]+)<\/version>/,
  );
  assert.ok(match, "backend version should be readable from pom.xml");
  return match[1];
}

test("release manifests and version derivation stay aligned", () => {
  const version = backendVersion();

  assert.equal(pkg.version, version);
  assert.equal(lock.version, version);
  assert.equal(lock.packages[""]?.version, version);

  assert.match(metadata, /EXPECTED_VERSION="\$\{ARENA_RELEASE_VERSION:-\}"/);
  assert.match(metadata, /EXPECTED_VERSION="\$\{EXPECTED_VERSION:-\$backend_version\}"/);
  assert.match(gate, /RELEASE_VERSION="\$\{ARENA_RELEASE_VERSION:-\}"/);
  assert.match(gate, /artifactId>arena-dev-api/);
});

test("release gate selects the v0.9 schema contract when V48 is present", () => {
  assert.match(gate, /verify-v0\.9-contract\.sh/);
  assert.match(gate, /expected_schema_version=48/);
  assert.match(gate, /verify-v0\.8-contract\.sh/);
  assert.match(gate, /expected_schema_version=38/);

  assert.match(verifier, /ARENA_SCHEMA_VERSION:-38/);
  assert.match(verifier, /interaction_shadow_observations/);
  assert.match(v09Contract, /V48__learning_core_release_gate\.sql/);
  assert.match(v09Contract, /physicalLegacyRemovalReady/);
});

test("proprietary licensing boundary from v0.5 remains explicit", () => {
  assert.match(license, /^Arena Dev Proprietary License/m);
  assert.doesNotMatch(license, /^MIT License$/m);
  assert.match(licensingHistory, /v0\.1\.x.*v0\.4\.x.*Arena Dev Community/s);
  assert.match(licensingHistory, /primeiro commit da linha `v0\.5`.*Arena Dev proprietário/s);
  assert.match(licensingHistory, /ccfb7f937e7ac7db330cfa5e54c3e3816b69962f/);
  assert.match(v09Contract, /Arena Dev Proprietary License/);
  assert.match(v09Contract, /LICENSING_HISTORY\.md/);
});

test("historical v0.8 semantic-library contract remains protected", () => {
  assert.match(verifier, /learning_resource_tags/);
  assert.match(verifier, /resource_snapshot_revision/);
  assert.match(v08Contract, /CanonicalDocument/);
  assert.match(v08Contract, /refresh-resource/);
  assert.match(v08Contract, /LibraryContentViews/);
});
