#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

fail(){ printf 'ERRO: %s\n' "$*" >&2; exit 1; }

"$SCRIPT_DIR/verify-v0.7-contract.sh"

for migration in {28..38}; do
  ls backend/src/main/resources/db/migration/V${migration}__*.sql >/dev/null 2>&1 ||     fail "migration V${migration} ausente"
done

required_files=(
  backend/src/main/java/br/com/arenadev/content/CanonicalDocument.java
  backend/src/main/java/br/com/arenadev/content/ContentCanonicalizer.java
  backend/src/main/java/br/com/arenadev/content/LearningResourceUsageService.java
  backend/src/main/java/br/com/arenadev/content/ingestion/LibraryIngestionController.java
  backend/src/main/java/br/com/arenadev/content/ingestion/LibraryIngestionService.java
  frontend/components/LibraryWorkspace.tsx
  frontend/components/LibraryContentViews.tsx
  frontend/components/LibraryImportPanel.tsx
  frontend/e2e/library-semantic.spec.ts
  docs/CONTENT_CANONICAL_MARKDOWN.md
  docs/INCREMENT_16_4D.md
  docs/INCREMENT_16_5C_PLAN.md
  docs/RELEASE_0_8.md
)

for required in "${required_files[@]}"; do
  [[ -f "$required" ]] || fail "contrato v0.8 ausente: $required"
done

V38="backend/src/main/resources/db/migration/V38__semantic_library_foundation.sql"
grep -qi 'learning_resource_tags' "$V38" || fail "V38 não cria learning_resource_tags"
grep -qi 'content_sha256' "$V38" || fail "V38 não persiste hash canônico"
grep -qi 'outline_json' "$V38" || fail "V38 não persiste outline derivado"

grep -q 'refresh-resource' backend/src/main/java/br/com/arenadev/journey/JourneyController.java ||   fail "refresh explícito de snapshot ausente"
grep -q 'JourneyStatus.DRAFT' backend/src/main/java/br/com/arenadev/journey/JourneyService.java ||   fail "refresh de snapshot não está protegido por estado DRAFT"
grep -q 'updateAvailable' backend/src/main/java/br/com/arenadev/content/LearningResourceUsageService.java ||   fail "revision awareness ausente"
grep -q 'Mapa do conteúdo' frontend/components/LibraryContentViews.tsx ||   fail "projeção Mapa do conteúdo ausente"
grep -q 'Importar material' frontend/components/LibraryImportPanel.tsx ||   fail "ingestão revisável da Biblioteca ausente"

printf 'Contrato funcional mínimo da v0.8 validado.\n'
