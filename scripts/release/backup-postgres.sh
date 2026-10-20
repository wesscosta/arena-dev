#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
AGE_RECIPIENT="${BACKUP_AGE_RECIPIENT:-}"
KEEP="${BACKUP_KEEP:-0}"

fail() {
  printf 'ERRO: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Uso: scripts/release/backup-postgres.sh [--output-dir DIRETORIO]
                                         [--encrypt-to CHAVE_PUBLICA_AGE] [--keep N]

Cria um dump PostgreSQL no formato custom, com checksum SHA-256. O caminho
do arquivo criado é a única linha escrita em stdout; mensagens vão para stderr.

  --encrypt-to  cifra o dump com age (https://age-encryption.org) para a chave
                pública informada e apaga a cópia em texto claro. Também por
                BACKUP_AGE_RECIPIENT. Restaure com BACKUP_AGE_IDENTITY.
  --keep N      mantém só os N backups mais recentes deste banco (também
                BACKUP_KEEP). 0 mantém todos.
EOF
}

while (($#)); do
  case "$1" in
    --output-dir)
      (($# >= 2)) || fail "--output-dir exige um diretório"
      OUTPUT_DIR="$2"
      shift
      ;;
    --encrypt-to)
      (($# >= 2)) || fail "--encrypt-to exige uma chave pública age"
      AGE_RECIPIENT="$2"
      shift
      ;;
    --keep)
      (($# >= 2)) || fail "--keep exige um número"
      KEEP="$2"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "argumento desconhecido: $1"
      ;;
  esac
  shift
done

[[ "$KEEP" =~ ^[0-9]+$ ]] || fail "--keep exige um número inteiro"
[[ -z "$AGE_RECIPIENT" ]] || command -v age >/dev/null 2>&1 || fail "age não encontrado (necessário para --encrypt-to)"

cd "$PROJECT_ROOT"
command -v docker >/dev/null 2>&1 || fail "Docker não encontrado"
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum não encontrado"
docker compose version >/dev/null 2>&1 || fail "Docker Compose não disponível"

postgres_id="$(docker compose ps --status running -q postgres)"
[[ -n "$postgres_id" ]] || fail "o serviço postgres do Compose não está em execução"

db_name="$(docker compose exec -T postgres sh -c 'printf %s "$POSTGRES_DB"')"
db_user="$(docker compose exec -T postgres sh -c 'printf %s "$POSTGRES_USER"')"
[[ -n "$db_name" && -n "$db_user" ]] || fail "não foi possível identificar banco e usuário"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$OUTPUT_DIR"
chmod 700 "$OUTPUT_DIR"
backup_file="$OUTPUT_DIR/arena-dev-${db_name}-${timestamp}.dump"
partial_file="${backup_file}.partial"
umask 077

cleanup_partial() {
  rm -f "$partial_file"
}
trap cleanup_partial EXIT

printf 'Criando backup consistente de %s...\n' "$db_name" >&2
docker compose exec -T postgres \
  pg_dump \
    --username "$db_user" \
    --dbname "$db_name" \
    --format custom \
    --compress 9 \
    --no-owner \
    --no-privileges > "$partial_file"

[[ -s "$partial_file" ]] || fail "o dump gerado está vazio"
mv "$partial_file" "$backup_file"
(
  cd "$(dirname "$backup_file")"
  sha256sum "$(basename "$backup_file")" > "$(basename "$backup_file").sha256"
)

if [[ -n "$AGE_RECIPIENT" ]]; then
  # Backups hold students' personal data; keep only the encrypted copy.
  age --recipient "$AGE_RECIPIENT" --output "${backup_file}.age" "$backup_file"
  rm -f "$backup_file" "${backup_file}.sha256"
  backup_file="${backup_file}.age"
  (
    cd "$(dirname "$backup_file")"
    sha256sum "$(basename "$backup_file")" > "$(basename "$backup_file").sha256"
  )
fi

if ((KEEP > 0)); then
  mapfile -t old_backups < <(
    ls -1t "$OUTPUT_DIR"/arena-dev-"${db_name}"-*.dump "$OUTPUT_DIR"/arena-dev-"${db_name}"-*.dump.age 2>/dev/null \
      | tail -n +"$((KEEP + 1))"
  )
  for old in "${old_backups[@]}"; do
    rm -f "$old" "${old}.sha256"
  done
  ((${#old_backups[@]} == 0)) || printf 'Rotação: %d backup(s) antigo(s) removido(s).\n' "${#old_backups[@]}" >&2
fi

trap - EXIT
printf 'Backup e checksum criados em %s\n' "$OUTPUT_DIR" >&2
printf '%s\n' "$backup_file"
