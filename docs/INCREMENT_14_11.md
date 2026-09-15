# Incremento 14.11 — Hardening, E2E e release gate da v0.6.0

## Objetivo
Fechar tecnicamente a v0.6.0 com versão final, backup restaurável, contrato mínimo da feature, gates backend/frontend, Docker isolado, Playwright E2E e CI no mesmo SHA.

## Gate local
```bash
scripts/release/release-gate.sh local
```

## Gate final
Após merge em `main`, CI verde no mesmo SHA e backup real:
```bash
scripts/release/release-gate.sh final --ci-run-url <URL_DO_RUN> --backup <ARQUIVO.dump>
```

## Política
O gate final não cria tag nem GitHub Release automaticamente. A tag `v0.6.0` só deve ser criada depois do gate final verde.

## Critério de encerramento
1. PR mergeado em `main`;
2. CI da `main` verde;
3. backup restaurável validado até V25;
4. gate final concluído;
5. tag `v0.6.0` e GitHub Release publicados.
