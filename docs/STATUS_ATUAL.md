# Estado atual — Arena Dev

**Última sincronização documental:** 7 de setembro de 2026

**Release estável:** `v0.3.0`, publicada em 05/09/2026.

**Linha ativa:** `v0.4 — Live Classroom`.

**Branch:** `feat/v0.4-live-classroom`.

**Próximo incremento:** **12.4D — Poll/Votação em runtime**.

Este arquivo é a referência técnica versionada do estado corrente. Documentos de incremento preservam histórico e podem conter estados superados.

## Evidência e precedência

1. código, migrations e configuração da árvore local validada;
2. `STATUS_ATUAL.md`;
3. `ROADMAP_0_4.md`;
4. ADRs aceitos;
5. documentos históricos.

A branch remota pode ficar temporariamente atrás da árvore local durante validações.

## Baseline estável v0.3.0

- commit: `6015d6d416edc26bfb8295c2aa6af141b9d6b9ad`;
- CI final registrada: `33964844054`, sucesso no mesmo SHA;
- release: <https://github.com/wesscosta/arena-dev/releases/tag/v0.3.0>;
- Next.js `16.3.3`, React `19.2.0`;
- MIT.

A tag está congelada. Não mover ou recriar.

Não há evidência registrada de que ensaio local de rollback ou `release-gate.sh final` tenham sido concluídos. Não marcar retroativamente esses passos como executados.

## Stack

| Camada | Estado |
| --- | --- |
| Frontend | Next.js 16.3.3, React 19.2, TypeScript 5.9 |
| Backend | Java 21, Spring Boot 4.1 |
| Persistência | PostgreSQL 17, JPA/Hibernate, Flyway |
| Realtime | Spring WebSocket |
| Infra local | Docker Compose |
| Arquitetura | monólito modular |

## Produto

```text
Visão geral = nível sistema
Turma       = contexto pedagógico
Arena       = operação da aula ao vivo
```

Arena Dev não é LMS.

## Consolidado

Domínio base:

- Classroom, Student, Enrollment;
- ClassSession, SessionParticipant e presença;
- ScoreEvent e ranking derivado;
- Activity e ActivityQuestion;
- resultados externos;
- sorteio, grupos, Boss Battle;
- join temporário, QR e Buzzer.

v0.4:

- 12.1 Timer;
- 12.2 Projector;
- 12.3 Word Cloud;
- ActivityStep autoral;
- editor do Roteiro;
- runtime autoritativo do step atual;
- 12.3D.6 navegação contextual;
- 12.3D.7A Design System;
- 12.3D.7B Core UI Primitives;
- 12.3D.7C Accessibility Pass;
- 12.3D.7D Responsive & Visual Polish.

## ActivityStep / Live Flow

```text
Activity
└── ActivityStep[]
    ├── SLIDE
    ├── QUESTION
    ├── WORD_CLOUD
    └── POLL
```

Runtime atual em `SessionDynamic.ARENA` mantém:

```text
activityId
currentQuestionId
answeredQuestionIds
currentStepId
currentStepPosition
```

Professor controla `start`, `previous` e `next`. Timer é transversal.

## Flyway

Maior migration detectada: **V10**.

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

O runtime do step atual não cria nova migration além da fundação persistente de ActivityStep.

## UI e acessibilidade

Primitives:

```text
Button
IconButton
Badge
Tabs
Menu
Breadcrumb
Field
Card
EmptyState
LiveRegion
```

Estilos:

```text
tokens.css
base.css
accessibility.css
arena-polish.css
```

Baseline:

- teclado;
- foco visível;
- skip link;
- landmark principal;
- focus management;
- contraste;
- reduced motion;
- zoom/reflow;
- LiveRegion controlado;
- Timer sem anúncio por segundo.

## Próximo — 12.4D Poll

Ainda não implementado em runtime.

Escopo:

- PollRound;
- PollVote;
- single-choice no MVP;
- um voto por participante/rodada;
- resultado agregado/anônimo;
- live ou collect→reveal;
- POLL_STATE;
- POLL_PARTICIPANT_STATE;
- POLL_VOTE;
- professor + /join + Projetor.

Poll não possui resposta correta nem XP no MVP.

## Depois

- 12.4E — orquestração Word Cloud/Poll a partir do step;
- 12.4F — `/join` + Projector pelo live step;
- 12.5 — SessionEvent cronológico;
- 12.6 — hardening e gate v0.4.

## Gate

```bash
cd frontend
npm test
npm run typecheck
npm run build

cd ..
docker compose up -d --build
sleep 5
docker compose ps
```

Backend alterado:

```bash
cd backend
mvn -B -ntp verify
```

## Versionamento

Os manifests permanecem em `0.3.0` enquanto o tooling de release esperar `0.3.0`. Isso é deliberado.
