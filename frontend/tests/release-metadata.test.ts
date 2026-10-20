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
const v010Contract = readFileSync(
  resolve(root, "scripts/release/verify-v0.10-contract.sh"),
  "utf8",
);
const v011Contract = readFileSync(
  resolve(root, "scripts/release/verify-v0.11-contract.sh"),
  "utf8",
);
const rollbackRehearsal = readFileSync(
  resolve(root, "scripts/release/rehearse-v09-v010-rollback.sh"),
  "utf8",
);
const v011RollbackRehearsal = readFileSync(
  resolve(root, "scripts/release/rehearse-v010-v011-rollback.sh"),
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
  assert.match(version, /^0\.11\.0(?:-(?:rc|beta)\.[0-9]+)?$/);

  assert.equal(lock.version, version);
  assert.equal(lock.packages[""]?.version, version);

  assert.match(metadata, /EXPECTED_VERSION="\$\{ARENA_RELEASE_VERSION:-\}"/);
  assert.match(metadata, /EXPECTED_VERSION="\$\{EXPECTED_VERSION:-\$backend_version\}"/);
  assert.match(gate, /RELEASE_VERSION="\$\{ARENA_RELEASE_VERSION:-\}"/);
  assert.match(gate, /artifactId>arena-dev-api/);
});

test("release gate uses v0.11/V60 without dropping v0.10/V56, v0.9/V48 and v0.8/V38 checks", () => {
  assert.match(gate, /verify-v0\.11-contract\.sh/);
  assert.match(gate, /expected_schema_version=60/);
  assert.match(gate, /expected_schema_version=59/);
  assert.match(gate, /expected_schema_version=58/);
  assert.match(gate, /verify-v0\.10-contract\.sh/);
  assert.match(gate, /expected_schema_version=56/);
  assert.match(gate, /verify-v0\.9-contract\.sh/);
  assert.match(gate, /expected_schema_version=48/);
  assert.match(gate, /verify-v0\.8-contract\.sh/);
  assert.match(gate, /expected_schema_version=38/);

  assert.match(verifier, /latest_migration/);
  assert.match(verifier, /EXPECTED_SCHEMA_VERSION="\$\{ARENA_SCHEMA_VERSION:-\$latest_migration\}"/);
  assert.match(verifier, /learning_intervention_cycles draw_session_settings draw_attempts/);
  assert.match(verifier, /arena_session_resource_placements learner_confidence/);
  assert.match(verifier, /reversal_request_id/);
  assert.match(verifier, /interaction_shadow_observations/);
  assert.match(v010Contract, /verify-v0\.9-contract\.sh/);
  assert.match(v010Contract, /\{49\.\.56\}/);
  assert.match(v010Contract, /learner_confidence/);
  assert.match(v09Contract, /V48__learning_core_release_gate\.sql/);
  assert.match(v09Contract, /physicalLegacyRemovalReady/);
});

test("final v0.11 release requires 0.11.0, the signed 11.6 attestation and a V58 backup", () => {
  assert.match(gate, /RELEASE_VERSION" == "0\.11\.0"/);
  assert.match(gate, /--attestation/);
  assert.match(gate, /v011-readiness\.py/);
  assert.match(gate, /--candidate "\$head_sha"/);
  assert.match(gate, /--ci-run-id "\$run_id"/);
  assert.match(v011Contract, /verify-v0\.10-contract\.sh/);
  assert.match(v011Contract, /V011_LAST_MIGRATION=60/);
  assert.match(v011Contract, /--check-template/);
  assert.match(v011Contract, /0\\\.11\\\.0/);
  assert.match(verifier, /arena_material_publications/);
  assert.match(verifier, /uq_arena_material_active_session/);
  assert.match(verifier, /arena_material_section_commands/);
});

test("v0.10-to-v0.11 rollback uses immutable tag, synthetic fixtures and isolated backup", () => {
  assert.match(v011RollbackRehearsal, /git archive v0\.10\.0 backend\//);
  assert.match(v011RollbackRehearsal, /docker network create/);
  assert.match(v011RollbackRehearsal, /CANDIDATE_IMAGE_FROM_CURRENT_SOURCE=ok/);
  assert.match(v011RollbackRehearsal, /sha256sum --check v56\.dump\.sha256/);
  assert.match(v011RollbackRehearsal, /UPGRADE_V56_TO_V58_PRESERVES_IDS_AND_XP/);
  assert.match(v011RollbackRehearsal, /BACKWARD_RESTORE_V56_AND_ORIGINAL_V010_API_READY/);
  assert.match(v011RollbackRehearsal, /trap cleanup EXIT/);
  assert.doesNotMatch(v011RollbackRehearsal, /docker compose down/);
  assert.doesNotMatch(v011RollbackRehearsal, /restore-postgres\.sh/);
});

test("final v0.10 release cannot ship prerelease metadata or missing backup", () => {
  assert.match(gate, /RELEASE_VERSION.*!= "0\.10\.0"/);
  assert.match(gate, /\[\[ "\$branch" == "main" \]\]/);
  assert.match(gate, /ci_sha.*head_sha/);
  assert.match(gate, /--backup/);
  assert.match(gate, /verify-backup\.sh/);
});

test("v0.9-to-v0.10 rollback uses immutable tag, synthetic fixtures and isolated backup", () => {
  assert.match(rollbackRehearsal, /git archive v0\.9\.0 backend\//);
  assert.match(rollbackRehearsal, /docker network create/);
  assert.match(rollbackRehearsal, /CANDIDATE_IMAGE_FROM_CURRENT_SOURCE=ok/);
  assert.match(rollbackRehearsal, /sha256sum --check v48\.dump\.sha256/);
  assert.match(rollbackRehearsal, /UPGRADE_V48_TO_V56_PRESERVES_IDS_AND_XP/);
  assert.match(rollbackRehearsal, /BACKWARD_RESTORE_V48_AND_ORIGINAL_V09_API_READY/);
  assert.match(rollbackRehearsal, /trap cleanup EXIT/);
  assert.doesNotMatch(rollbackRehearsal, /docker compose down/);
  assert.doesNotMatch(rollbackRehearsal, /restore-postgres\.sh/);
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
