# Checkpoint v0.4 — pré-12.4D

**Data:** 07/09/2026

**Branch:** `feat/v0.4-live-classroom`

**Próximo:** `12.4D — Poll/Votação em runtime`

## Fechado

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

## Último gate informado

```text
npm test           OK
npm run typecheck  OK
npm run build      OK
docker compose     OK
```

## Flyway

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

## Próxima sequência

```text
12.4D Poll runtime
↓
12.4E Orquestração
↓
12.4F /join + Projector pelo live step
↓
12.5 SessionEvent
↓
12.6 Hardening
```

## Restrições

Não abrir antes do Poll, salvo regressão real:

- microserviços;
- Redis/Kafka;
- Kubernetes;
- event bus genérico;
- nova refatoração transversal de UI;
- alteração casual da versão dos manifests.
