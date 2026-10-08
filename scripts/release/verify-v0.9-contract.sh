#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

fail(){ printf 'ERRO: %s\n' "$*" >&2; exit 1; }

"$SCRIPT_DIR/verify-v0.8-contract.sh"

for migration in {39..48}; do
  ls backend/src/main/resources/db/migration/V${migration}__*.sql >/dev/null 2>&1 || \
    fail "migration V${migration} ausente"
done

required_files=(
  backend/src/main/java/br/com/arenadev/learning/LearningTarget.java
  backend/src/main/java/br/com/arenadev/learning/LearningEvidence.java
  backend/src/main/java/br/com/arenadev/interaction/InteractionDefinition.java
  backend/src/main/java/br/com/arenadev/interaction/InteractionRun.java
  backend/src/main/java/br/com/arenadev/interaction/InteractionResponse.java
  backend/src/main/java/br/com/arenadev/interaction/InteractionEvaluation.java
  backend/src/main/java/br/com/arenadev/interaction/InteractionTraceService.java
  backend/src/main/java/br/com/arenadev/interaction/InteractionCutoverGateService.java
  backend/src/main/java/br/com/arenadev/interaction/InteractionShadowObservation.java
  backend/src/main/java/br/com/arenadev/realtime/SessionRuntimeSnapshotService.java
  backend/src/main/resources/db/migration/V48__learning_core_release_gate.sql
  docs/v0.9/CURRENT_STATE_AUDIT.md
  docs/v0.9/FINAL_ARCHITECTURE_GATE.md
  docs/HANDOFF_V0_9.md
  docs/adr/ADR-0050-proprietary-baseline-from-v0.9.md
  LEGACY_LICENSE_NOTICE.md
  LICENSE
)

for required in "${required_files[@]}"; do
  [[ -f "$required" ]] || fail "contrato v0.9 ausente: $required"
done

V48="backend/src/main/resources/db/migration/V48__learning_core_release_gate.sql"
grep -q 'interaction_shadow_observations' "$V48" || \
  fail "V48 não cria observações duráveis dos shadows"
grep -q 'legacy_round_id uuid not null' "$V48" || \
  fail "V48 não preserva referência lógica à rodada legada"
if grep -Eqi 'drop[[:space:]]+table.*(quiz_rounds|poll_rounds|word_cloud_rounds)' "$V48"; then
  fail "V48 remove fisicamente legado e quebra a janela de rollback"
fi

grep -q 'rawResponseJson' backend/src/main/java/br/com/arenadev/interaction/InteractionTraceService.java || \
  fail "trace AI-ready não expõe resposta bruta"
grep -q 'evaluatorVersion' backend/src/main/java/br/com/arenadev/interaction/InteractionTraceService.java || \
  fail "trace AI-ready não expõe evaluator/version"
grep -q 'learningEvidence' backend/src/main/java/br/com/arenadev/interaction/InteractionTraceService.java || \
  fail "trace AI-ready não valida LearningEvidence"
grep -q 'logicalCutoverReady' backend/src/main/java/br/com/arenadev/interaction/InteractionCutoverGateService.java || \
  fail "gate de cutover lógico ausente"
grep -q 'physicalLegacyRemovalReady' backend/src/main/java/br/com/arenadev/interaction/InteractionCutoverGateService.java || \
  fail "barreira explícita de remoção física ausente"
grep -q 'ACTIVITY_QUESTION' backend/src/main/java/br/com/arenadev/interaction/QuizInteractionAdapter.java || \
  fail "Quiz adapter não possui ContentRef estruturado"

grep -q '^Arena Dev Proprietary License$' LICENSE || \
  fail "v0.9 deve usar a licença proprietária do Arena Dev"
grep -q 'v0.9.0.*first release' LEGACY_LICENSE_NOTICE.md || \
  fail "aviso de licenciamento histórico não define a fronteira proprietária da v0.9"
if grep -q '^MIT License$' LICENSE; then
  fail "LICENSE atual não pode permanecer MIT na v0.9"
fi

printf 'Contrato arquitetural mínimo da v0.9 validado até V48, incluindo a fronteira de licença proprietária.\n'
