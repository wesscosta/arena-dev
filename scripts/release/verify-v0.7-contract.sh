#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

fail(){ printf 'ERRO: %s\n' "$*" >&2; exit 1; }

"$SCRIPT_DIR/verify-v0.6-contract.sh"

for migration in 26 27; do
  ls backend/src/main/resources/db/migration/V${migration}__*.sql >/dev/null 2>&1 ||     fail "migration V${migration} ausente"
done

V26="backend/src/main/resources/db/migration/V26__integration_core_persistence.sql"
V27="backend/src/main/resources/db/migration/V27__integration_encrypted_credentials.sql"

for table in   integration_connections   external_classroom_links   external_student_links   external_activity_links   external_submission_links   sync_executions   sync_items   sync_checkpoints; do
  grep -qi "create table ${table}" "$V26" ||     fail "V26 não cria a tabela obrigatória: ${table}"
done

grep -qi "integration_connections" "$V27" ||   fail "V27 não referencia integration_connections"

required_files=(
  backend/src/main/java/br/com/arenadev/integration/application/IntegrationConnectionService.java
  backend/src/main/java/br/com/arenadev/integration/application/SyncExecutionService.java
  backend/src/main/java/br/com/arenadev/integration/application/SyncTelemetryRunner.java
  backend/src/main/java/br/com/arenadev/integration/application/IntegrationObservabilityService.java
  backend/src/main/java/br/com/arenadev/integration/persistence/IntegrationConnectionEntity.java
  backend/src/main/java/br/com/arenadev/integration/persistence/ExternalClassroomLinkEntity.java
  backend/src/main/java/br/com/arenadev/integration/persistence/ExternalStudentLinkEntity.java
  backend/src/main/java/br/com/arenadev/integration/persistence/ExternalActivityLinkEntity.java
  backend/src/main/java/br/com/arenadev/integration/persistence/ExternalSubmissionLinkEntity.java
  backend/src/main/java/br/com/arenadev/integration/provider/microsoft/MicrosoftIdentityConnectionService.java
  backend/src/main/java/br/com/arenadev/integration/provider/microsoft/MicrosoftGraphEducationClient.java
  backend/src/main/java/br/com/arenadev/integration/provider/microsoft/MicrosoftRosterDiscoveryService.java
  backend/src/main/java/br/com/arenadev/integration/provider/microsoft/MicrosoftActivityMappingService.java
  backend/src/main/java/br/com/arenadev/integration/provider/microsoft/MicrosoftSubmissionImportService.java
  backend/src/main/java/br/com/arenadev/integration/provider/microsoft/MicrosoftSubmissionOutcomePublishService.java
  frontend/components/MicrosoftIntegrationConsole.tsx
  frontend/lib/integration-observability-api.ts
  docs/INCREMENT_15_8A.md
  docs/INCREMENT_15_8B.md
  docs/INCREMENT_15_8C.md
)

for required in "${required_files[@]}"; do
  [[ -f "$required" ]] || fail "contrato v0.7 ausente: $required"
done

grep -q 'MICROSOFT_TEAMS'   backend/src/main/java/br/com/arenadev/integration/domain/LearningPlatformProvider.java ||   fail "provider MICROSOFT_TEAMS ausente"

grep -q 'REQUIRES_NEW'   backend/src/main/java/br/com/arenadev/integration/application/SyncTelemetryStore.java ||   fail "telemetria não preserva falhas em transação independente"

grep -q 'ASSESSMENT_PUBLISH'   backend/src/main/java/br/com/arenadev/integration/provider/microsoft/MicrosoftSubmissionOutcomePublishService.java ||   fail "publicação de avaliação não está instrumentada"

grep -q 'integration-observability-history'   frontend/components/MicrosoftIntegrationConsole.tsx ||   fail "drill-down de observabilidade ausente"

duplicate_integration_keys="$(
  awk -F= '
    /^[[:space:]]*APP_INTEGRATIONS_[A-Z0-9_]+=/ {
      key=$1
      gsub(/[[:space:]]/, "", key)
      count[key]++
    }
    END {
      for (key in count) if (count[key] > 1) print key
    }
  ' .env.example
)"
[[ -z "$duplicate_integration_keys" ]] ||   fail "variáveis de integração duplicadas em .env.example: $duplicate_integration_keys"

printf 'Contrato funcional mínimo da v0.7 validado.\n'
