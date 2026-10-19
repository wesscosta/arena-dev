#!/usr/bin/env bash
# Release candidate contract. Preserves all v0.9 guarantees and enforces the
# additive v0.10 schema/features without declaring the release published.
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

fail() { printf 'ERRO: %s\n' "$*" >&2; exit 1; }
"$SCRIPT_DIR/verify-v0.9-contract.sh"

for n in {49..56}; do
  migrations=(backend/src/main/resources/db/migration/V${n}__*.sql)
  [[ -f "${migrations[0]}" && ${#migrations[@]} -eq 1 ]] || \
    fail "migration V${n} ausente ou duplicada"
done

required=(
  backend/src/main/java/br/com/arenadev/learning/loop/LearningCycle.java
  backend/src/main/java/br/com/arenadev/learning/loop/LearningCycleService.java
  backend/src/main/java/br/com/arenadev/learning/overview/SessionLearningOverviewService.java
  backend/src/main/java/br/com/arenadev/learning/placement/ArenaResourcePlacementService.java
  backend/src/main/java/br/com/arenadev/learning/confidence/LearnerConfidenceService.java
  backend/src/main/java/br/com/arenadev/learning/clinic/LearningErrorClinicService.java
  frontend/components/learning/TeacherLearningOverview.tsx
  frontend/components/arena/live/ArenaContextualMaterial.tsx
  frontend/public/sw.js
  frontend/public/offline.html
  scripts/release/rehearse-v09-v010-rollback.sh
  docs/adr/ADR-0061-session-learning-overview-teacher-only.md
)
for path in "${required[@]}"; do
  [[ -f "$path" ]] || fail "contrato v0.10 ausente: $path"
done

grep -q 'arena_session_resource_placements' backend/src/main/resources/db/migration/V54__*.sql || \
  fail "vínculo canônico da Biblioteca não persistido"
grep -q 'learner_confidence' backend/src/main/resources/db/migration/V55__*.sql || \
  fail "autopercepção voluntária não persistida"
grep -q 'create_request_id' backend/src/main/resources/db/migration/V56__*.sql || \
  fail "idempotência na criação de XP não persistida"
grep -q 'DrawProtocolGuard' backend/src/main/java/br/com/arenadev/draw/DrawService.java || \
  fail "proteção contra mistura de sorteios ausente"
grep -q 'createPortal' frontend/components/arena/live/ArenaContextualMaterial.tsx || \
  fail "modal de material pode voltar a ser recortado pelo cabeçalho"
grep -q 'createPortal' frontend/components/learning/TeacherLearningOverview.tsx || \
  fail "painel pedagógico pode voltar a ser recortado pelo cabeçalho"

# Prevent accidental 0.9.0 artifacts. The v0.11 line reuses this baseline and
# enforces its own exact version in verify-v0.11-contract.sh; the final release
# gate still approves main/CI/backup independently.
node -e 'const v=require("./frontend/package.json").version; if(!/^0\.1[01]\.0(?:-(?:rc|beta)\.[0-9]+)?$/.test(v)) process.exit(1)' || \
  fail "artefatos devem identificar 0.10.0/0.11.0 ou uma candidata 0.10.0-rc.N/0.11.0-rc.N"

printf 'Contrato mínimo v0.10 verificado: baseline v0.9 + Flyway V49–V56, %s.\n' \
  "$(node -p 'require("./frontend/package.json").version')"
