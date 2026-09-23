# Incremento 15.9 — Hardening, E2E & Release Gate

## Objetivo

Encerrar a linha v0.7 sem adicionar funcionalidades, consolidando metadados,
contratos, restore-check, CI, E2E e documentação.

## Alterações

- versão alinhada para `0.7.0` em Maven, npm e lockfile;
- `.env.example` normalizado, sem chaves de integração duplicadas;
- `verify-v0.7-contract.sh` cumulativo sobre o contrato v0.6;
- release gate atualizado para v0.7;
- restore-check atualizado para Flyway V27 e tabelas do Integration Core;
- teste de metadados atualizado para v0.7;
- nome do job E2E corrigido para a release atual;
- documentação corrente sincronizada;
- Google Classroom formalizado como standby não bloqueante.

## Gate local

```bash
bash -n scripts/release/*.sh
scripts/release/check-metadata.sh
scripts/release/verify-v0.7-contract.sh

cd backend
mvn -B -ntp verify

cd ../frontend
npm test
npm run typecheck
npm run build

cd ..
docker compose config --quiet
git diff --check
```

Gate completo:

```bash
scripts/release/release-gate.sh local
```

## Critério de fechamento

O incremento só é considerado concluído quando o gate local completo estiver
verde. Merge, tag e GitHub Release permanecem passos externos.
