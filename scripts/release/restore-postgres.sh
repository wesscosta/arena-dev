#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

fail() {
  printf 'ERRO: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Uso: scripts/release/restore-postgres.sh CAMINHO_DO_DUMP --confirm-replace

Operação destrutiva e explícita. Verifica o dump em um PostgreSQL temporário,
para backend/frontend, cria um backup de segurança, recria o banco corrente,
restaura os dados e reinicia apenas os serviços que estavam ativos.
EOF
}

[[ ${1:-} != "-h" && ${1:-} != "--help" ]] || {
  usage
  exit 0
}
[[ $# -eq 2 && "$2" == "--confirm-replace" ]] || fail "use CAMINHO_DO_DUMP --confirm-replace"

backup_file="$1"
[[ -f "$backup_file" ]] || fail "backup não encontrado: $backup_file"

cd "$PROJECT_ROOT"
command -v docker >/dev/null 2>&1 || fail "Docker não encontrado"
docker compose version >/dev/null 2>&1 || fail "Docker Compose não disponível"
[[ -n "$(docker compose ps --status running -q postgres)" ]] || fail "o serviço postgres não está em execução"

"$SCRIPT_DIR/verify-backup.sh" "$backup_file"

backend_was_running="$(docker compose ps --status running -q backend)"
frontend_was_running="$(docker compose ps --status running -q frontend)"
safety_backup=""
restore_started=false

services_to_start=()
[[ -z "$backend_was_running" ]] || services_to_start+=(backend)
[[ -z "$frontend_was_running" ]] || services_to_start+=(frontend)

on_error() {
  status=$?
  trap - ERR
  set +e
  if $restore_started; then
    printf 'A restauração falhou. Os serviços permanecerão parados.\n' >&2
    printf 'Backup de segurança preservado em: %s\n' "$safety_backup" >&2
  elif ((${#services_to_start[@]})); then
    printf 'A preparação falhou antes da substituição do banco; reiniciando os serviços originais.\n' >&2
    docker compose up --detach --wait "${services_to_start[@]}" >/dev/null 2>&1
  fi
  exit "$status"
}
trap on_error ERR

if ((${#services_to_start[@]})); then
  docker compose stop "${services_to_start[@]}" >/dev/null
fi

safety_backup="$($SCRIPT_DIR/backup-postgres.sh)"
db_name="$(docker compose exec -T postgres sh -c 'printf %s "$POSTGRES_DB"')"
db_user="$(docker compose exec -T postgres sh -c 'printf %s "$POSTGRES_USER"')"
restore_started=true

docker compose exec -T postgres \
  psql \
    --no-psqlrc \
    --set ON_ERROR_STOP=1 \
    --username "$db_user" \
    --dbname postgres \
    --variable "target_db=$db_name" \
    --variable "target_owner=$db_user" <<'SQL'
select pg_terminate_backend(pid)
from pg_stat_activity
where datname = :'target_db' and pid <> pg_backend_pid();
drop database if exists :"target_db";
create database :"target_db" owner :"target_owner";
SQL

docker compose exec -T postgres \
  pg_restore \
    --username "$db_user" \
    --dbname "$db_name" \
    --no-owner \
    --no-privileges \
    --exit-on-error < "$backup_file"

if ((${#services_to_start[@]})); then
  docker compose up --detach --wait "${services_to_start[@]}"
fi

restore_started=false
trap - ERR
printf 'Banco %s restaurado com sucesso.\n' "$db_name"
printf 'Backup anterior à restauração: %s\n' "$safety_backup"
