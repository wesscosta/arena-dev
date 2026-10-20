#!/usr/bin/env bash

set -Eeuo pipefail

POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:17-alpine}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# By default verify the checked-out schema, not a stale V38 or V48 from
# earlier releases. ARENA_SCHEMA_VERSION intentionally supports historical dumps.
latest_migration="$(find "$PROJECT_ROOT/backend/src/main/resources/db/migration" -maxdepth 1 -name 'V[0-9]*__*.sql' -printf '%f\n' \
    | sed -nE 's/^V([0-9]+)__.*$/\1/p' | sort -n | tail -n 1)"
[[ "$latest_migration" =~ ^[0-9]+$ ]] || { echo 'Não foi possível detectar versão Flyway' >&2; exit 1; }
EXPECTED_SCHEMA_VERSION="${ARENA_SCHEMA_VERSION:-$latest_migration}"
CONTAINER_NAME="arena-dev-restore-check-$(date -u +%Y%m%d%H%M%S)-$$"
CHECK_USER="arena_restore_check"
CHECK_DATABASE="arena_restore_check"
CHECK_PASSWORD="restore-check-only-$$"

fail() {
  printf 'ERRO: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Uso: scripts/release/verify-backup.sh CAMINHO_DO_DUMP

Restaura o dump em um PostgreSQL 17 temporário e isolado, valida o histórico
Flyway até ARENA_SCHEMA_VERSION (default: versão mais recente do checkout)
e confirma os contratos persistentes críticos.
EOF
}

[[ ${1:-} != "-h" && ${1:-} != "--help" ]] || {
  usage
  exit 0
}
[[ $# -eq 1 ]] || fail "informe exatamente um arquivo de backup"

backup_file="$1"
[[ -f "$backup_file" ]] || fail "backup não encontrado: $backup_file"
[[ -s "$backup_file" ]] || fail "backup vazio: $backup_file"

command -v docker >/dev/null 2>&1 || fail "Docker não encontrado"
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum não encontrado"
docker info >/dev/null 2>&1 || fail "daemon Docker indisponível"

checksum_file="${backup_file}.sha256"
if [[ -f "$checksum_file" ]]; then
  (
    cd "$(dirname "$backup_file")"
    sha256sum --check "$(basename "$checksum_file")"
  )
else
  printf 'AVISO: checksum ausente; a integridade criptográfica não foi comprovada.\n' >&2
fi

cleanup() {
  docker rm --force "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run   --detach   --rm   --name "$CONTAINER_NAME"   --env "POSTGRES_USER=$CHECK_USER"   --env "POSTGRES_PASSWORD=$CHECK_PASSWORD"   --env "POSTGRES_DB=$CHECK_DATABASE"   "$POSTGRES_IMAGE" >/dev/null

ready=false
for _ in {1..30}; do
  if docker exec "$CONTAINER_NAME" sh -c     "pg_isready --username '$CHECK_USER' --dbname postgres >/dev/null 2>&1 && psql --tuples-only --no-align --username '$CHECK_USER' --dbname postgres --command "select 1 from pg_database where datname = '$CHECK_DATABASE'" | grep -qx 1"; then
    ready=true
    break
  fi
  sleep 1
done
$ready || fail "PostgreSQL temporário ou banco $CHECK_DATABASE não ficou pronto em 30 segundos"

docker exec -i "$CONTAINER_NAME" pg_restore --list < "$backup_file" >/dev/null
docker exec -i "$CONTAINER_NAME"   pg_restore     --username "$CHECK_USER"     --dbname "$CHECK_DATABASE"     --no-owner     --no-privileges     --exit-on-error < "$backup_file"

migration_count="$(docker exec "$CONTAINER_NAME"   psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE"   --command "select count(*) from flyway_schema_history where success and version ~ '^[0-9]+$'")"
[[ "$migration_count" -eq "$EXPECTED_SCHEMA_VERSION" ]] ||   fail "histórico Flyway restaurado possui $migration_count migrations numéricas; esperado $EXPECTED_SCHEMA_VERSION"

latest_version="$(docker exec "$CONTAINER_NAME"   psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE"   --command "select max(version::integer) from flyway_schema_history where success and version ~ '^[0-9]+$'")"
[[ "$latest_version" -eq "$EXPECTED_SCHEMA_VERSION" ]] ||   fail "maior migration restaurada é V$latest_version; esperado V$EXPECTED_SCHEMA_VERSION"

expected_tables=(
  classrooms students enrollments class_sessions score_events activities activity_steps
  session_events session_timers buzzer_rounds word_cloud_rounds poll_rounds
  enrollment_device_claims quiz_rounds quiz_participant_answers activity_submissions
  submission_items submission_assessments activity_rubric_criteria assessment_criteria
  ai_assessment_suggestions ai_assessment_criterion_suggestions submission_process_events
  activity_provider_links submission_provider_links integration_connections
  external_classroom_links external_student_links external_activity_links
  external_submission_links sync_executions sync_items sync_checkpoints
  journeys journey_stages journey_stage_progress learning_resources journey_sections
  journey_redemption_codes student_journey_access student_journey_stage_progress
  student_achievements learning_resource_tags
)

for table in "${expected_tables[@]}"; do
  exists="$(docker exec "$CONTAINER_NAME"     psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE"     --command "select to_regclass('public.$table') is not null")"
  [[ "$exists" == "t" ]] || fail "tabela obrigatória ausente após restore: $table"
done

if (( EXPECTED_SCHEMA_VERSION >= 48 )); then
  v09_tables=(
    learning_targets interaction_definitions interaction_options interaction_runs
    interaction_responses interaction_evaluations learning_evidence
    quiz_interaction_shadow_links poll_interaction_shadow_links
    word_cloud_interaction_shadow_links interaction_shadow_observations
  )
  for table in "${v09_tables[@]}"; do
    exists="$(docker exec "$CONTAINER_NAME" \
      psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE" \
      --command "select to_regclass('public.$table') is not null")"
    [[ "$exists" == "t" ]] || fail "tabela v0.9 obrigatória ausente após restore: $table"
  done
fi

if (( EXPECTED_SCHEMA_VERSION >= 55 )); then
  v010_tables=(
    learning_intervention_cycles draw_session_settings draw_attempts
    draw_attempt_score_links learning_error_clinic_notes
    arena_session_resource_placements learner_confidence
  )
  for table in "${v010_tables[@]}"; do
    exists="$(docker exec "$CONTAINER_NAME" \
      psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE" \
      --command "select to_regclass('public.$table') is not null")"
    [[ "$exists" == "t" ]] || fail "tabela v0.10 obrigatória ausente após restore: $table"
  done
  # Latest schema includes intervention strategy, reversal audit, and
  # self-perception. A checksum alone cannot prove these schema invariants.
  required_columns="$(docker exec "$CONTAINER_NAME" \
    psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE" \
    --command "select count(*) from information_schema.columns where table_schema='public' and \
      (table_name='learning_intervention_cycles' and column_name='intervention_type' or \
       table_name='score_events' and column_name='reversal_request_id' or \
       table_name='learner_confidence' and column_name='level')")"
  [[ "$required_columns" -eq 3 ]] || fail "restore v0.10 não preserva colunas obrigatórias de intervenção, reversão XP e confiança"
fi

if (( EXPECTED_SCHEMA_VERSION >= 56 )); then
  idempotency_column="$(docker exec "$CONTAINER_NAME" \
    psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE" \
    --command "select count(*) from information_schema.columns where table_schema='public' and table_name='score_events' and column_name='create_request_id'")"
  [[ "$idempotency_column" -eq 1 ]] || fail "restore V56 perdeu a chave de idempotência de XP"
fi

if (( EXPECTED_SCHEMA_VERSION >= 57 )); then
  # v0.11 public projection: immutable snapshot plus at most one ACTIVE
  # publication per session. Losing the partial index reopens double publish.
  publication_contract="$(docker exec "$CONTAINER_NAME" \
    psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE" \
    --command "select (to_regclass('public.arena_material_publications') is not null)::int + \
      (select count(*) from pg_indexes where schemaname='public' and tablename='arena_material_publications' \
        and indexname='uq_arena_material_active_session')")"
  [[ "$publication_contract" -eq 2 ]] || fail "restore V57 perdeu publicações do projetor ou a unicidade da apresentação ativa"
fi

if (( EXPECTED_SCHEMA_VERSION >= 58 )); then
  section_commands="$(docker exec "$CONTAINER_NAME" \
    psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE" \
    --command "select to_regclass('public.arena_material_section_commands') is not null")"
  [[ "$section_commands" == "t" ]] || fail "restore V58 perdeu os comandos idempotentes de seção"
fi
if (( EXPECTED_SCHEMA_VERSION >= 59 )); then
  teacher_preferences="$(docker exec "$CONTAINER_NAME" \
    psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE" \
    --command "select to_regclass('public.teacher_preferences') is not null")"
  [[ "$teacher_preferences" == "t" ]] || fail "restore V59 perdeu as preferências do professor"
fi
if (( EXPECTED_SCHEMA_VERSION >= 60 )); then
  anonymized_column="$(docker exec "$CONTAINER_NAME" \
    psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE" \
    --command "select count(*) from information_schema.columns where table_name = 'students' and column_name = 'anonymized_at'")"
  [[ "$anonymized_column" -eq 1 ]] || fail "restore V60 perdeu a marca de aluno anonimizado"
fi

semantic_columns="$(docker exec "$CONTAINER_NAME"   psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE"   --command "select count(*) from information_schema.columns where table_schema='public' and table_name='learning_resources' and column_name in ('library_visible','revision','archived_at','subject','language','content_sha256','outline_json','outline_parser_version')")"
[[ "$semantic_columns" -eq 8 ]] || fail "LearningResource não contém o contrato completo da Biblioteca semântica"

snapshot_columns="$(docker exec "$CONTAINER_NAME"   psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE"   --command "select count(*) from information_schema.columns where table_schema='public' and table_name='journey_stages' and column_name in ('resource_snapshot_body','resource_snapshot_format','resource_snapshot_source_url','resource_snapshot_source_label','resource_snapshot_revision')")"
[[ "$snapshot_columns" -eq 5 ]] || fail "JourneyStage não contém o contrato completo de snapshot"

study_access="$(docker exec "$CONTAINER_NAME"   psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE"   --command "select count(*) from information_schema.columns where table_schema='public' and table_name='classrooms' and column_name='student_study_access_enabled'")"
[[ "$study_access" -eq 1 ]] || fail "controle de visibilidade do workspace estudantil ausente"

printf 'Backup restaurado e validado em PostgreSQL 17 até Flyway V%s: %s\n' "$EXPECTED_SCHEMA_VERSION" "$backup_file"
