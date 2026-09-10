#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXPECTED_VERSION="${ARENA_RELEASE_VERSION:-0.4.0}"
REQUIRE_LICENSE=false

fail() {
  printf 'ERRO: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Uso: scripts/release/check-metadata.sh [--require-license]

Valida o alinhamento das versões e impede artefatos locais ou segredos
conhecidos de entrarem no conjunto de arquivos rastreados pelo Git.
EOF
}

while (($#)); do
  case "$1" in
    --require-license)
      REQUIRE_LICENSE=true
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

command -v git >/dev/null 2>&1 || fail "git não encontrado"
command -v node >/dev/null 2>&1 || fail "Node.js não encontrado"

backend_version="$({
  awk '
    /<artifactId>arena-dev-api<\/artifactId>/ { artifact = 1; next }
    artifact && /<version>/ {
      line = $0
      sub(/^.*<version>/, "", line)
      sub(/<\/version>.*$/, "", line)
      print line
      exit
    }
  ' backend/pom.xml
})"
frontend_version="$(node -p "require('./frontend/package.json').version")"
lock_version="$(node -p "require('./frontend/package-lock.json').version")"
lock_root_version="$(node -p "require('./frontend/package-lock.json').packages[''].version")"

for version_entry in \
  "backend/pom.xml:$backend_version" \
  "frontend/package.json:$frontend_version" \
  "frontend/package-lock.json:$lock_version" \
  "frontend/package-lock.json#packages-root:$lock_root_version"; do
  file="${version_entry%%:*}"
  version="${version_entry#*:}"
  [[ "$version" == "$EXPECTED_VERSION" ]] || \
    fail "$file usa versão '$version'; esperado '$EXPECTED_VERSION'"
done

while IFS= read -r tracked_file; do
  case "$tracked_file" in
    .env|*/.env|.env.*|*/.env.*)
      [[ "$tracked_file" == ".env.example" || "$tracked_file" == */.env.example ]] || \
        fail "arquivo de ambiente rastreado pelo Git: $tracked_file"
      ;;
    backups/*|release-evidence/*|backend/target/*|frontend/.next/*|frontend/node_modules/*|frontend/playwright-report/*|frontend/test-results/*)
      fail "artefato local rastreado pelo Git: $tracked_file"
      ;;
  esac
done < <(git ls-files)

if $REQUIRE_LICENSE; then
  [[ -f LICENSE || -f LICENSE.md || -f LICENSE.txt ]] || \
    fail "a licença do projeto ainda não foi definida"
fi

printf 'Metadados da release %s validados.\n' "$EXPECTED_VERSION"
