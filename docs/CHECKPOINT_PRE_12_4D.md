# Checkpoint v0.4 — pré-12.4D

**Data histórica:** 07/09/2026
**Branch:** `feat/v0.4-live-classroom`
**Status:** **checkpoint histórico, supersedido em 08/09/2026 pela fundação 12.4D.0.**

> Este documento preserva o ponto imediatamente anterior à decisão de introduzir Live Stage. A indicação original “Poll como próximo passo” não é mais vigente. Consulte [`STATUS_ATUAL.md`](STATUS_ATUAL.md) e [`INCREMENT_12_4D_0.md`](INCREMENT_12_4D_0.md).

## Fechado até este checkpoint

- Timer;
- Projector;
- Word Cloud;
- ActivityStep;
- editor do Roteiro;
- runtime autoritativo do step;
- navegação contextual sem sidebar;
- Design System;
- Core UI Primitives;
- Accessibility Pass;
- Responsive & Visual Polish.

## Gate registrado naquele momento

```text
npm test           OK
npm run typecheck  OK
npm run build      OK
docker compose     OK
```

## Flyway naquele checkpoint

Maior migration detectada: `V10`.

- `V1` — `classroom session foundation`.
- `V2` — `one active session per classroom`.
- `V3` — `score events`.
- `V4` — `activities and session mechanics`.
- `V5` — `external activity results`.
- `V6` — `session join and buzzer`.
- `V7` — `session timers`.
- `V8` — `word cloud`.
- `V9` — `word cloud max words integer`.
- `V10` — `activity steps`.

## Sequência originalmente prevista

```text
12.4D Poll runtime
↓
12.4E Orquestração
↓
12.4F /join + Projector pelo live step
```

## Decisão posterior — 08/09/2026

A sequência acima foi corrigida antes do Poll para evitar arquitetura orientada a flags/features:

```text
12.4D.0A Live Stage / Presentation State
↓
12.4D.0B Dinâmicas + adapters de palco
↓
12.4D.0C preferredName / displayName
↓
12.4D.0D device claim opaco
↓
12.4D.1 Poll runtime
```

O checkpoint continua versionado como evidência histórica; não deve ser usado como fonte corrente de roadmap.
