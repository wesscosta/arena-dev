#!/usr/bin/env bash

set -Eeuo pipefail

POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:17-alpine}"
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

Restaura o dump em um PostgreSQL 17 temporário e isolado, confirma o histórico
Flyway V1-V6 e as tabelas centrais, e remove o container ao terminar.
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

docker run \
  --detach \
  --rm \
  --name "$CONTAINER_NAME" \
  --env "POSTGRES_USER=$CHECK_USER" \
  --env "POSTGRES_PASSWORD=$CHECK_PASSWORD" \
  --env "POSTGRES_DB=$CHECK_DATABASE" \
  "$POSTGRES_IMAGE" >/dev/null

ready=false
for _ in {1..30}; do
  if docker exec "$CONTAINER_NAME" pg_isready --username "$CHECK_USER" --dbname "$CHECK_DATABASE" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
$ready || fail "PostgreSQL temporário não ficou pronto em 30 segundos"

docker exec -i "$CONTAINER_NAME" pg_restore --list < "$backup_file" >/dev/null
docker exec -i "$CONTAINER_NAME" \
  pg_restore \
    --username "$CHECK_USER" \
    --dbname "$CHECK_DATABASE" \
    --no-owner \
    --no-privileges \
    --exit-on-error < "$backup_file"

migration_count="$(docker exec "$CONTAINER_NAME" \
  psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE" \
  --command "select count(*) from flyway_schema_history where success")"
[[ "$migration_count" -eq 6 ]] || fail "histórico Flyway restaurado possui $migration_count migrations; esperado 6"

core_table_count="$(docker exec "$CONTAINER_NAME" \
  psql --tuples-only --no-align --username "$CHECK_USER" --dbname "$CHECK_DATABASE" \
  --command "select count(*) from (values ('classrooms'), ('students'), ('class_sessions'), ('score_events'), ('activities'), ('buzzer_rounds')) as expected(name) where to_regclass('public.' || name) is not null")"
[[ "$core_table_count" -eq 6 ]] || fail "nem todas as tabelas centrais foram restauradas"

printf 'Backup restaurado e validado em PostgreSQL 17: %s\n' "$backup_file"
