# Release `v0.3.0` — publicada

**Estado:** publicada em **05/09/2026**.

**Tag:** `v0.3.0`.

**Commit:** `6015d6d416edc26bfb8295c2aa6af141b9d6b9ad`.

**CI final registrada:** `33964844054`, concluída com sucesso no mesmo SHA.

**GitHub Release:** <https://github.com/wesscosta/arena-dev/releases/tag/v0.3.0>

## Registro histórico

Este documento registra uma release já publicada. A tag `v0.3.0` não deve ser movida, recriada ou retargeted.

As tags `v0.1-legacy`, `v0.2.0` e `v0.2.1` pertencem ao desktop legado e não são rollback targets compatíveis com a plataforma web.

## Escopo congelado

Inclui a baseline web anterior à v0.4:

- domínios operacionais em Spring Boot/PostgreSQL;
- segurança administrativa por sessão HTTP e CSRF;
- join temporário;
- Buzzer autoritativo;
- XP por ScoreEvent;
- ranking derivado;
- atividades e questões;
- importação de resultados externos;
- sorteio, grupos e Boss Battle persistentes;
- CI/E2E/hardening;
- Next.js 16.3.3;
- MIT.

Timer sincronizado, Projector dedicado, Word Cloud, ActivityStep, Design System e demais recursos Live Classroom pertencem à **v0.4**.

## Evidência final confirmada

- frontend: 12/12 testes na baseline final;
- typecheck: aprovado;
- build de produção: aprovado;
- `npm audit --omit=dev`: zero vulnerabilidades;
- CI `33964844054`: sucesso;
- SHA: `6015d6d416edc26bfb8295c2aa6af141b9d6b9ad`;
- backup PostgreSQL real em formato custom foi criado e restaurado isoladamente em PostgreSQL 17.

## Não inventar evidência

Sem evidência adicional, não marcar como concluídos:

- ensaio operacional local de rollback;
- `scripts/release/release-gate.sh final`.

A publicação não transforma automaticamente esses passos em evidência executada.

## Tooling

O tooling usado nesta release foi originalmente fixado em `0.3.0`. A partir do 12.6 da linha v0.4, o tooling corrente foi atualizado para `0.4.0`; isso não altera nem move a tag histórica `v0.3.0`.

```bash
scripts/release/check-metadata.sh
scripts/release/release-gate.sh local
scripts/release/backup-postgres.sh
scripts/release/verify-backup.sh
```

## Linha posterior

O desenvolvimento segue em `feat/v0.4-live-classroom`.

Consulte `STATUS_ATUAL.md`, `ROADMAP_0_4.md` e `CHECKPOINT_PRE_12_4D.md`.

## Sincronizar notas da GitHub Release

Somente depois de commitar/pushar este documento:

```bash
gh release edit v0.3.0 \
  --repo wesscosta/arena-dev \
  --notes-file docs/RELEASE_0_3_0.md
```

O comando edita as notas; não move a tag.
