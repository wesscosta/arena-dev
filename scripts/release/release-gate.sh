#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RELEASE_VERSION="${ARENA_RELEASE_VERSION:-0.3.0}"
MODE="${1:-}"
CI_RUN_URL=""
BACKUP_FILE=""

fail() {
  printf 'ERRO: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Uso:
  scripts/release/release-gate.sh local
  scripts/release/release-gate.sh final --ci-run-url URL --backup ARQUIVO

local  Executa todos os gates técnicos locais e gera evidência ignorada pelo Git.
final  Exige main limpa/sincronizada, licença, CI verde no mesmo SHA e backup
       restaurável; depois repete os gates locais. Não cria tag nem release.
EOF
}

case "$MODE" in
  local|final)
    shift
    ;;
  -h|--help|"")
    usage
    exit 0
    ;;
  *)
    fail "modo inválido: $MODE"
    ;;
esac

while (($#)); do
  case "$1" in
    --ci-run-url)
      (($# >= 2)) || fail "--ci-run-url exige uma URL"
      CI_RUN_URL="$2"
      shift
      ;;
    --backup)
      (($# >= 2)) || fail "--backup exige um arquivo"
      BACKUP_FILE="$2"
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

cd "$PROJECT_ROOT"
mkdir -p release-evidence
evidence_file="release-evidence/v${RELEASE_VERSION}-${MODE}-$(date -u +%Y%m%dT%H%M%SZ).log"
exec > >(tee "$evidence_file") 2>&1

printf 'Arena Dev — gate %s da versão %s\n' "$MODE" "$RELEASE_VERSION"
printf 'Início UTC: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"

for command_name in git java mvn node npm docker; do
  command -v "$command_name" >/dev/null 2>&1 || fail "$command_name não encontrado"
done
docker compose version >/dev/null 2>&1 || fail "Docker Compose não disponível"
docker info >/dev/null 2>&1 || fail "daemon Docker indisponível"

java_line="$(java -version 2>&1 | head -n 1)"
node_line="$(node --version)"
[[ "$java_line" == *'"21.'* ]] || fail "Java 21 é obrigatório; encontrado: $java_line"
[[ "$node_line" == v22.* ]] || fail "Node.js 22 é obrigatório; encontrado: $node_line"

"$SCRIPT_DIR/check-metadata.sh"

head_sha="$(git rev-parse HEAD)"
branch="$(git branch --show-current)"
printf 'Commit: %s\n' "$head_sha"
printf 'Branch: %s\n' "$branch"
printf 'Java: %s\n' "$java_line"
printf 'Node.js: %s\n' "$node_line"

if [[ "$MODE" == "final" ]]; then
  [[ "$branch" == "main" ]] || fail "o gate final deve executar na branch main"
  [[ -z "$(git status --porcelain)" ]] || fail "a árvore de trabalho não está limpa"

  origin_url="$(git remote get-url origin 2>/dev/null)" || fail "remote origin não configurado"
  case "$origin_url" in
    git@github.com:wesscosta/arena-dev.git|https://github.com/wesscosta/arena-dev.git)
      ;;
    *)
      fail "origin não aponta para o repositório canônico: $origin_url"
      ;;
  esac

  git fetch --prune origin main

  upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null)" || \
    fail "main não possui upstream configurado"
  [[ "$head_sha" == "$(git rev-parse "$upstream")" ]] || \
    fail "HEAD diverge de $upstream; sincronize antes da release"

  "$SCRIPT_DIR/check-metadata.sh" --require-license
  [[ -n "$CI_RUN_URL" ]] || fail "informe --ci-run-url"
  [[ -n "$BACKUP_FILE" ]] || fail "informe --backup"
  [[ -f "$BACKUP_FILE" ]] || fail "backup não encontrado: $BACKUP_FILE"
  [[ -f "${BACKUP_FILE}.sha256" ]] || fail "checksum do backup não encontrado: ${BACKUP_FILE}.sha256"

  command -v gh >/dev/null 2>&1 || fail "GitHub CLI não encontrado"
  run_id="${CI_RUN_URL%/}"
  run_id="${run_id##*/}"
  [[ "$run_id" =~ ^[0-9]+$ ]] || fail "não foi possível extrair o ID da execução do CI"

  IFS=$'\t' read -r ci_status ci_conclusion ci_sha verified_ci_url < <(
    gh run view "$run_id" \
      --repo wesscosta/arena-dev \
      --json status,conclusion,headSha,url \
      --jq '[.status, .conclusion, .headSha, .url] | @tsv'
  )
  [[ "$ci_status" == "completed" && "$ci_conclusion" == "success" ]] || \
    fail "CI não está verde: status=$ci_status conclusion=$ci_conclusion"
  [[ "$ci_sha" == "$head_sha" ]] || \
    fail "CI validou $ci_sha, mas a release aponta para $head_sha"
  printf 'CI validado: %s\n' "$verified_ci_url"

  "$SCRIPT_DIR/verify-backup.sh" "$BACKUP_FILE"
fi

printf 'Executando gate backend...\n'
(
  cd backend
  mvn -B -ntp verify
)

printf 'Executando gate frontend...\n'
(
  cd frontend
  npm ci
  npm audit --omit=dev --audit-level=high
  npm test
  npm run typecheck
  npm run build
  npx playwright install chromium
)

docker compose config --quiet
POSTGRES_PASSWORD='release-gate-database-password' \
APP_FRONTEND_URL='https://arena.example.test' \
APP_ALLOWED_ORIGIN_PATTERNS='https://arena.example.test' \
APP_TEACHER_USERNAME='professor' \
APP_TEACHER_PASSWORD='release-gate-teacher-password' \
NEXT_PUBLIC_API_URL='https://api.arena.example.test' \
  docker compose -f compose.yaml -f compose.prod.yaml config --quiet

for fixed_container in arena-dev-postgres arena-dev-backend arena-dev-frontend; do
  if docker ps --all --format '{{.Names}}' | grep --fixed-strings --line-regexp --quiet "$fixed_container"; then
    fail "o container $fixed_container já existe; preserve-o e remova/renomeie antes do gate isolado"
  fi
done

compose_project="arena_release_gate_$$"
export COMPOSE_PROJECT_NAME="$compose_project"
export POSTGRES_DB="arena_dev_release_gate"
export POSTGRES_USER="arena"
export POSTGRES_PASSWORD="release-gate-database-password"
export POSTGRES_PORT="55432"
export BACKEND_PORT="58080"
export FRONTEND_PORT="53000"
export APP_FRONTEND_URL="http://localhost:${FRONTEND_PORT}"
export APP_ALLOWED_ORIGIN_PATTERNS="http://localhost:${FRONTEND_PORT}"
export APP_TEACHER_USERNAME="professor"
export APP_TEACHER_PASSWORD="release-gate-teacher-password"
export NEXT_PUBLIC_API_URL="http://localhost:${BACKEND_PORT}"
export E2E_FRONTEND_URL="http://localhost:${FRONTEND_PORT}"
export E2E_API_URL="http://127.0.0.1:${BACKEND_PORT}"
export E2E_TEACHER_USERNAME="$APP_TEACHER_USERNAME"
export E2E_TEACHER_PASSWORD="$APP_TEACHER_PASSWORD"

stack_created=false
cleanup_stack() {
  if $stack_created; then
    docker compose --project-name "$compose_project" down --volumes --remove-orphans >/dev/null 2>&1 || true
  fi
}
trap cleanup_stack EXIT

docker compose --project-name "$compose_project" build backend frontend
stack_created=true
docker compose --project-name "$compose_project" up --detach --wait
[[ "$(docker compose --project-name "$compose_project" exec -T backend id -un)" == "arena" ]] || \
  fail "backend não está executando como usuário arena"
[[ "$(docker compose --project-name "$compose_project" exec -T frontend id -un)" == "arena" ]] || \
  fail "frontend não está executando como usuário arena"

(
  cd frontend
  npm run test:e2e
)

cleanup_stack
stack_created=false
trap - EXIT

printf 'Gate %s concluído com sucesso.\n' "$MODE"
printf 'Fim UTC: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf 'Evidência local: %s\n' "$evidence_file"
