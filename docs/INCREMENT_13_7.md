# 13.7 — Hardening, E2E e gate da v0.5.0

**Data:** 11/09/2026  
**Status:** release candidate preparada; evidências local, CI, backup/restore e gate final ainda precisam ser registradas.

## Objetivo

Fechar `v0.5.0 — Live Quiz & Structured Responses` como release candidate reproduzível sem introduzir novo domínio funcional.

## Escopo de fechamento

O 13.7 concentra:

1. E2E real do Quiz em Chromium;
2. restore-check atualizado até Flyway V17;
3. metadata/tooling alinhados em `0.5.0`;
4. documentação de release candidate;
5. gate local e gate final no mesmo SHA da CI.

## E2E completo do Quiz

O cenário adicional em `frontend/e2e/critical-flows.spec.ts` cobre:

```text
ActivityQuestion
   ↓
Quiz READY
   ↓
OPEN
   ↓
/join responde
   ↓
reload/reconnect
   ↓
resposta preservada
   ↓
LOCKED
   ↓
avaliação automática
   ↓
ScoreEvent source=QUIZ
   ↓
REVEALED
   ↓
Projector exibe correção
   ↓
reload do Projector
   ↓
snapshot mantém reveal
```

Antes de `REVEALED`, o E2E exige que o Projetor mostre **Resultados protegidos** e não mostre **RESPOSTA CORRETA**.

## Backup/restore

`verify-backup.sh` passa a exigir:

- 16 migrations Flyway bem-sucedidas;
- maior versão igual a V16;
- 15 tabelas centrais, incluindo `quiz_rounds` e `quiz_participant_answers`;
- colunas `evaluated_at`, `is_correct` e `score_event_id` da V16.

Nenhuma migration nova é criada no 13.7.

## Metadata

O release candidate alinha:

```text
backend/pom.xml                  0.5.0
frontend/package.json            0.5.0
frontend/package-lock.json       0.5.0
check-metadata.sh                0.5.0
release-gate.sh                  0.5.0
```

A tag `v0.5.0` não deve ser criada durante a preparação.

## Gates locais

Executar:

```bash
cd frontend
npm ci
npm audit --omit=dev --audit-level=high
npm test
npm run typecheck
npm run build

cd ../backend
mvn -B -ntp verify

cd ..
bash -n scripts/release/*.sh
scripts/release/check-metadata.sh --require-license
scripts/release/release-gate.sh local
```

O `release-gate.sh local` já executa backend, frontend, Compose e Playwright; os comandos separados tornam a falha mais fácil de localizar.

## Evidência final obrigatória

Somente após merge em `main` e CI verde no SHA final:

```bash
BACKUP_FILE="$(scripts/release/backup-postgres.sh)"
scripts/release/verify-backup.sh "$BACKUP_FILE"

scripts/release/release-gate.sh final \
  --ci-run-url https://github.com/wesscosta/arena-dev/actions/runs/ID \
  --backup "$BACKUP_FILE"
```

Depois, e somente depois:

```text
tag anotada v0.5.0
GitHub Release v0.5.0
```

## Definition of Done — código preparado

- [x] Quiz Runtime e respostas estruturadas;
- [x] resultados privados + reveal público;
- [x] avaliação automática com `ScoreEvent`;
- [x] feedback pedagógico;
- [x] Mobile/PWA;
- [x] E2E Quiz versionado;
- [x] restore-check preparado para V16;
- [x] metadata preparada em `0.5.0`;
- [x] documentação de release candidate.

## Evidência operacional — não marcar sem execução

- [ ] `npm test`, `typecheck` e `build` verdes no estado final;
- [ ] `mvn verify` verde no estado final;
- [ ] Compose + Playwright completos verdes;
- [ ] `release-gate.sh local` verde;
- [ ] PR integrado em `main`;
- [ ] CI verde no SHA de merge;
- [ ] backup real + SHA-256 criados;
- [ ] restore-check V1–V17 verde;
- [ ] ensaio de rollback/restore registrado;
- [ ] `release-gate.sh final` verde no mesmo SHA;
- [ ] tag anotada `v0.5.0`;
- [ ] GitHub Release publicada.

Nenhuma evidência operacional deve ser inferida a partir da simples existência de commits.
