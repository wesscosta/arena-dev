#!/usr/bin/env bash
# Release candidate contract. Preserves all v0.10 guarantees and enforces the
# additive v0.11 schema/features without declaring the release published.
# A green contract is NOT the operational GO: v011-readiness.py decides that.
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

fail() { printf 'ERRO: %s\n' "$*" >&2; exit 1; }
"$SCRIPT_DIR/verify-v0.10-contract.sh"

# The v0.11 schema line: V57-V58 (material presentation) plus the additive
# pre-GO hardening of rc.5 (V59 teacher preferences, V60 student
# anonymization). Anything later belongs
# to the next line.
V011_LAST_MIGRATION=60
for ((n = 57; n <= V011_LAST_MIGRATION; n++)); do
  migrations=(backend/src/main/resources/db/migration/V${n}__*.sql)
  [[ -f "${migrations[0]}" && ${#migrations[@]} -eq 1 ]] || \
    fail "migration V${n} ausente ou duplicada"
done
extra=(backend/src/main/resources/db/migration/V$((V011_LAST_MIGRATION + 1))__*.sql)
[[ ! -e "${extra[0]}" ]] || fail "V$((V011_LAST_MIGRATION + 1)) pertence a uma linha posterior; o contrato v0.11 termina em V${V011_LAST_MIGRATION}"

required=(
  backend/src/main/java/br/com/arenadev/learning/presentation/MaterialPublicationController.java
  backend/src/main/java/br/com/arenadev/learning/presentation/MaterialPublicationService.java
  frontend/components/ProjectedMaterialReader.tsx
  frontend/lib/material-presentation-api.ts
  frontend/lib/material-section-sync.ts
  frontend/lib/security-headers.ts
  docs/adr/ADR-0067-material-presentation-v011.md
  docs/v0.11/11.6_ACCEPTANCE_TEMPLATE.json
  scripts/release/v011-readiness.py
  scripts/release/tests/test_v011_readiness.py
  scripts/release/rehearse-v010-v011-rollback.sh
)
for path in "${required[@]}"; do
  [[ -f "$path" ]] || fail "contrato v0.11 ausente: $path"
done

grep -q 'uq_arena_material_active_session' backend/src/main/resources/db/migration/V57__*.sql || \
  fail "unicidade da apresentação ativa por sessão não persistida"
grep -q "status in ('ACTIVE','REVOKED')" backend/src/main/resources/db/migration/V57__*.sql || \
  fail "estado de revogação da publicação não restrito"
grep -q 'primary key (session_id, request_id)' backend/src/main/resources/db/migration/V58__*.sql || \
  fail "idempotência dos comandos de seção não persistida"
grep -q '/api/projector/{code}/material' \
  backend/src/main/java/br/com/arenadev/learning/presentation/MaterialPublicationController.java || \
  fail "endpoint público mínimo do projetor ausente"
grep -q "frame-ancestors 'none'" frontend/lib/security-headers.ts || \
  fail "CSP do frontend perdeu frame-ancestors"
grep -q "object-src 'none'" frontend/lib/security-headers.ts || \
  fail "CSP do frontend perdeu object-src"
grep -q 'v0.11 / 11.6' frontend/e2e/arena-shell.spec.ts || \
  fail "cenário E2E de dois projetores 11.6 ausente"
python3 scripts/release/v011-readiness.py \
  --attestation docs/v0.11/11.6_ACCEPTANCE_TEMPLATE.json --check-template >/dev/null || \
  fail "template de aceite 11.6 deixou de iniciar NO-GO"

node -e 'const v=require("./frontend/package.json").version; if(!/^0\.11\.0(?:-(?:rc|beta)\.[0-9]+)?$/.test(v)) process.exit(1)' || \
  fail "artefatos v0.11 devem identificar 0.11.0 ou uma candidata 0.11.0-rc.N"

printf 'Contrato mínimo v0.11 verificado: baseline v0.10 + Flyway V57–V%s, %s.\n' \
  "$V011_LAST_MIGRATION" "$(node -p 'require("./frontend/package.json").version')"
