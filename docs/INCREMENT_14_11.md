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

## Fechamento visual 14.11A–C

Após o fechamento funcional do 14.11, a validação manual consolidou um polish adicional de UI:

- remoção de microcopy redundante;
- normalização tipográfica;
- retorno à Home ao encerrar sessão;
- refinamento do Timer;
- badge AO VIVO ao lado do título;
- cards de turma com dimensões e footer uniformes;
- CTAs Iniciar/Continuar Arena em largura total e linguagem visual coerente.

Detalhes em `POLISH_14_11A_UI_DECLUTTER.md`, `POLISH_14_11B_TYPOGRAPHY_AND_SESSION_EXIT.md` e `POLISH_14_11C_UI_FINAL.md`.
