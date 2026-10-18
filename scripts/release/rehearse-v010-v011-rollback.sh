#!/usr/bin/env bash
# Non-destructive rehearsal: v0.10.0 tagged binary and Flyway V56 -> backup ->
# v0.11 candidate/Flyway V58 -> restore original V56 -> restart tagged v0.10.
# Uses synthetic records and standalone disposable Docker containers ONLY.
# Evidence for the 11.6 gate backup_restore_rollback; it does not sign the gate.
# Expected data loss on rollback: anything written after the upgrade (e.g.
# material publications/section commands) is discarded with the V58 database.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
fail() { printf 'NO-GO: %s\n' "$*" >&2; exit 1; }
for tool in git docker tar mktemp sha256sum; do command -v "$tool" >/dev/null || fail "$tool ausente"; done
[[ -f backend/src/main/resources/db/migration/V58__arena_material_section_commands.sql ]] || \
  fail "checkout não é uma candidata v0.11 (V58 ausente)"
[[ "$(git rev-parse v0.10.0^{commit})" ]] || fail "tag v0.10.0 indisponível"
git cat-file -e 'v0.10.0:backend/pom.xml' || fail "código histórico ausente"

scratch="$(mktemp -d -t arena-v011-rollback-XXXXXXXX)"
chmod 700 "$scratch"
id="$(basename "$scratch" | tr '[:upper:]' '[:lower:]')"
net="${id}-net"; db="${id}-pg"; old="${id}-v010"; candidate="${id}-v011"
oldimage="${id}:v010"; candidateimage="${id}:v011"
network_created=false
cleanup() {
  docker rm -f "$old" "$candidate" "$db" >/dev/null 2>&1 || true
  if $network_created; then docker network rm "$net" >/dev/null 2>&1 || true; fi
  docker image rm "$oldimage" "$candidateimage" >/dev/null 2>&1 || true
  rm -rf -- "$scratch"
}
trap cleanup EXIT

printf 'FONTE_OLD_TAG=%s\n' "$(git rev-parse v0.10.0^{commit})"
printf 'FONTE_RC=%s\n' "$(git rev-parse HEAD)"
printf '%s\n' 'Preparando código v0.10.0 da tag em área temporária, sem usar a instalação principal.'
mkdir -p "$scratch/backend"
git archive v0.10.0 backend/ | tar -x -C "$scratch"
# Same Java 21 multi-stage runtime recipe as the candidate; app code remains tag-pure.
cp backend/Dockerfile "$scratch/backend/Dockerfile"
docker build --progress=plain -t "$oldimage" "$scratch/backend" >"$scratch/v010-build.log" 2>&1 || {
  tail -25 "$scratch/v010-build.log" >&2
  fail "não foi possível construir o binário original da tag v0.10.0"
}
printf 'OLD_IMAGE_OK=%s\n' "$oldimage"
# Build candidate from this checkout rather than trusting a potentially stale
# preexisting 'latest' image. All source stays on the private build context.
docker build --progress=plain -t "$candidateimage" "$ROOT/backend" >"$scratch/v011-build.log" 2>&1 || {
  tail -25 "$scratch/v011-build.log" >&2
  fail "não foi possível construir o backend do checkout v0.11"
}
printf 'CANDIDATE_IMAGE_FROM_CURRENT_SOURCE=ok\n'
docker network create "$net" >/dev/null; network_created=true
docker run --detach --rm --name "$db" --network "$net" \
  -e POSTGRES_USER=arena -e POSTGRES_PASSWORD=temporary-synthetic-only \
  -e POSTGRES_DB=arena_rollback postgres:17-alpine >/dev/null
wait_for_pg() {
  for _ in {1..45}; do
    if docker exec "$db" pg_isready -q -U arena -d arena_rollback; then return 0; fi
    sleep 1
  done
  fail "PostgreSQL isolado indisponível"
}
wait_for_pg
psql_sql() { docker exec -i "$db" psql -X -v ON_ERROR_STOP=1 -At -U arena -d arena_rollback -c "$1"; }
start_api() {
  local name="$1" image="$2"
  docker run --detach --rm --name "$name" --network "$net" \
    -e "SPRING_DATASOURCE_URL=jdbc:postgresql://$db:5432/arena_rollback" \
    -e SPRING_DATASOURCE_USERNAME=arena \
    -e SPRING_DATASOURCE_PASSWORD=temporary-synthetic-only \
    -e APP_TEACHER_USERNAME=rollback_teacher \
    -e APP_TEACHER_PASSWORD=rollback-synthetic-test-only \
    -e APP_ALLOWED_ORIGIN_PATTERNS='http://localhost:3000' \
    "$image" >/dev/null
  for _ in {1..65}; do
    if docker exec "$name" sh -c 'wget -q -O /dev/null http://127.0.0.1:8080/api/health/ready' 2>/dev/null; then return 0; fi
    if ! docker ps -q --filter "name=^/${name}$" | grep -q .; then fail "API $name terminou antes do readiness"; fi
    sleep 1
  done
  docker logs --tail 25 "$name" >&2 || true
  fail "API $name não ficou pronta"
}
flyway_max="select max(version::int) from flyway_schema_history where success and version~'^[0-9]+$'"
flyway_count="select count(*) from flyway_schema_history where success and version~'^[0-9]+$'"

start_api "$old" "$oldimage"
[[ "$(psql_sql "$flyway_max")" == 56 ]] || fail "v0.10 não inicializou Flyway V56"
printf 'OLD_API_V56_READY=ok\n'
# Strictly synthetic fixture: one classroom, student, enrolled participant,
# active session and immutable original XP plus its historical reversal.
psql_sql "
insert into classrooms(id,name,code) values ('11111111-1111-4111-8111-111111111111','TURMA SIMULADA DE ROLLBACK','ROLLBACK11');
insert into students(id,name,registration) values ('22222222-2222-4222-8222-222222222222','ALUNO SINTETICO','RB-TEST-01');
insert into enrollments(id,classroom_id,student_id) values ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
insert into class_sessions(id,classroom_id,title,status) values ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','SESSAO SIMULADA','ACTIVE');
insert into session_participants(id,session_id,student_id,present) values ('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222',true);
insert into score_events(id,classroom_id,student_id,session_id,points,category,description,source) values ('66666666-6666-4666-8666-666666666666','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333',7,'BONUS','BONUS SIMULADO','MANUAL');
insert into score_events(id,classroom_id,student_id,session_id,points,category,description,source,reversal_of) values ('77777777-7777-4777-8777-777777777777','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333',-7,'ADJUSTMENT','REVERSAO SIMULADA','MANUAL','66666666-6666-4666-8666-666666666666');
" >/dev/null
fingerprint_sql="select concat_ws('|',
  (select count(*) from classrooms where code='ROLLBACK11'),
  (select count(*) from students where registration='RB-TEST-01'),
  (select count(*) from enrollments where classroom_id='11111111-1111-4111-8111-111111111111'),
  (select count(*) from session_participants where session_id='33333333-3333-4333-8333-333333333333' and present),
  (select count(*) from score_events where session_id='33333333-3333-4333-8333-333333333333'),
  (select coalesce(sum(points),0) from score_events where session_id='33333333-3333-4333-8333-333333333333'),
  (select count(*) from score_events where reversal_of='66666666-6666-4666-8666-666666666666'))"
original="$(psql_sql "$fingerprint_sql")"
[[ "$original" == '1|1|1|1|2|0|1' ]] || fail "invariantes da fixture V56 inconsistentes: $original"

docker exec "$db" pg_dump -U arena -d arena_rollback -Fc --no-owner --no-privileges >"$scratch/v56.dump"
[[ -s "$scratch/v56.dump" ]] || fail "dump pré-upgrade vazio"
(cd "$scratch" && sha256sum v56.dump > v56.dump.sha256 && sha256sum --check v56.dump.sha256 >/dev/null)
printf 'PRE_UPGRADE_BACKUP_SHA256=ok\n'
docker stop "$old" >/dev/null
start_api "$candidate" "$candidateimage"
[[ "$(psql_sql "$flyway_max")" == 58 ]] || fail "Flyway upgrade V58 não finalizado"
[[ "$(psql_sql "$flyway_count")" == 58 ]] || fail "histórico Flyway após upgrade inconsistente"
[[ "$(psql_sql "select to_regclass('public.arena_material_publications') is not null and to_regclass('public.arena_material_section_commands') is not null")" == 't' ]] || fail "novas tabelas V57/V58 ausentes"
[[ "$(psql_sql "select count(*) from pg_indexes where schemaname='public' and tablename='arena_material_publications' and indexname='uq_arena_material_active_session'")" == 1 ]] || fail "unicidade da apresentação ativa V57 ausente"
[[ "$(psql_sql "$fingerprint_sql")" == "$original" ]] || fail "registros/XP foram alterados pelo upgrade"
printf 'UPGRADE_V56_TO_V58_PRESERVES_IDS_AND_XP=ok\n'
docker stop "$candidate" >/dev/null
# Never run the older binary against V58: restore V56 BEFORE starting v0.10.
(cd "$scratch" && sha256sum --check v56.dump.sha256 >/dev/null)
docker exec "$db" psql -X -v ON_ERROR_STOP=1 -U arena -d postgres -c 'drop database arena_rollback with (force)' >/dev/null
docker exec "$db" psql -X -v ON_ERROR_STOP=1 -U arena -d postgres -c 'create database arena_rollback owner arena' >/dev/null
docker exec -i "$db" pg_restore -U arena -d arena_rollback --no-owner --no-privileges --exit-on-error <"$scratch/v56.dump"
[[ "$(psql_sql "$flyway_max")" == 56 ]] || fail "o restore não voltou a V56"
[[ "$(psql_sql "select to_regclass('public.arena_material_publications') is null")" == 't' ]] || fail "restore não removeu estrutura da RC"
[[ "$(psql_sql "$fingerprint_sql")" == "$original" ]] || fail "restore alterou IDs, presença ou XP"
start_api "$old" "$oldimage"
[[ "$(psql_sql "$fingerprint_sql")" == "$original" ]] || fail "a v0.10 alterou invariantes após rollback"
printf 'BACKWARD_RESTORE_V56_AND_ORIGINAL_V010_API_READY=ok\n'
printf 'SYNTHETIC_DATA_FINGERPRINT=%s\n' "$original"
printf 'ROLLBACK_REHEARSAL_RESULT=PASS (nenhum banco de desenvolvimento/produção modificado)\n'
