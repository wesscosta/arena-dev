# Estado atual — Arena Dev

**Última sincronização documental:** 9 de setembro de 2026

**Release estável:** `v0.3.0`, publicada em 05/09/2026.

**Linha ativa:** `v0.4.0 — Live Classroom` release candidate.

**Branch:** `feat/v0.4-live-classroom`.

**Checkpoint local:** **12.1–12.6 implementados localmente. A candidate `0.4.0` possui hardening de login, `X-Request-Id`, liveness/readiness, três cenários Playwright críticos e tooling de release alinhado a V1–V14.**

**Próximo passo:** **fechar evidências externas da release candidate: `mvn verify`, Compose/Playwright, CI remoto, backup/restore, rollback ensaiado e `release-gate.sh final` no mesmo SHA.**

Este arquivo é a referência técnica versionada do estado corrente. Documentos de incremento preservam histórico e podem conter estados superados.

## Evidência e precedência

1. código, migrations e configuração da árvore local validada;
2. `STATUS_ATUAL.md`;
3. `ROADMAP_0_4.md`;
4. ADRs aceitos;
5. documentos históricos.

A branch remota pode ficar temporariamente atrás da árvore local durante validações. Em 08/09/2026, o ZIP de trabalho analisado estava 14 commits à frente da referência remota disponível no início deste incremento.

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

## Produto e arquitetura de informação

```text
Visão geral = nível sistema
Turma       = contexto pedagógico
Arena       = operação da aula ao vivo

Arena
├── Condução
├── Dinâmicas
│   ├── Sorteio
│   ├── Nuvem de Palavras
│   ├── Buzzer
│   ├── Votação         implementada
│   ├── Quiz            futuro
│   └── Boss Battle     migração progressiva para palco
├── Tempo
├── Presença
└── Organização
```

Arena Dev não é LMS. Não reintroduzir sidebar global apenas para duplicar o contexto já resolvido por `Visão geral › Turma › Arena`.

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
- 12.3D.7D Responsive & Visual Polish;
- 12.4D.0A Live Stage / Presentation State;
- 12.4D.0B: `Dinâmicas`, Sorteio/Nuvem/Buzzer/Poll no palco;
- 12.4D.0C: `Enrollment.preferredName` e `DisplayNameService`;
- 12.4D.0D: device claim opaco separado do participant token;
- 12.4D.1: Poll single-choice, resultados agregados/anônimos, `/join` e Projetor;
- 12.4E: Live Flow orquestra Live Stage; Slide/Question possuem projeção própria; Word Cloud/Poll reutilizam a rodada vinculada ao step; Boss ativa o palco compartilhado.

## Live Stage / Projection State

A sessão possui **um único palco principal autoritativo**, em vez de flags concorrentes por feature.

```text
Professor ──comanda──► LiveStageState
                         │
                         ├── primary.type
                         ├── audience
                         └── overlays.timer
                           ↙             ↘
                    /projector           /join
                   visão pública      visão individual
```

`DynamicType.LIVE_STAGE` reutiliza `session_dynamics`; não exige migration nova.

Tipos do contrato:

```text
IDLE
DRAW
SLIDE
QUESTION
QUIZ
WORD_CLOUD
POLL
BUZZER
BOSS_BATTLE
TIMER
```

Audiências:

```text
PROJECTOR
PARTICIPANTS
BOTH
```

Regras:

- apenas um `primary` por sessão;
- Timer pode continuar transversal via overlay;
- professor, Projetor e participante recebem projeções próprias do mesmo estado;
- clientes públicos não devem decidir política de exposição de identidade;
- `LIVE_STAGE_STATE` seleciona o palco, enquanto eventos especializados mantêm o detalhe do módulo;
- Sorteio, Nuvem, Poll e Buzzer ativam o palco pelos runtimes especializados;
- Slide e Question usam projeção preparada do `ActivityStep`;
- Boss Battle já possui adapter de seleção do palco;
- não ativar tipos sem adapter/renderização correspondente.

Consulte [`INCREMENT_12_4D_0.md`](INCREMENT_12_4D_0.md), [`INCREMENT_12_4E.md`](INCREMENT_12_4E.md), ADR-0027 e ADR-0029.

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
stepRuntimeIds      # vínculo stepId → roundId para runtimes preparados
```

Professor controla `start`, `previous` e `next`. O Live Flow e o Live Stage continuam abstrações distintas: **roteiro define sequência; palco define o que está sendo apresentado agora**. Desde o 12.4E, os steps autorados acionam o palco e, para Word Cloud/Poll, reutilizam o runtime especializado já vinculado ao step sem criar domínio paralelo.

## Identidade — implementação local concluída

```text
Student           = identidade canônica
Enrollment        = preferredName no contexto da turma
Device claim      = identificador opaco persistente por matrícula
Participant token = credencial temporária da sessão
```

- `V11` adiciona `Enrollment.preferredName` com backfill do nickname legado;
- `DisplayNameService` resolve a política no backend antes da projeção pública;
- `V12` adiciona claims opacos de dispositivo, expirados/revogáveis;
- `localStorage` contém somente device claim por turma;
- `sessionStorage` contém somente participant token da aula atual;
- reconhecer o dispositivo apenas facilita a reentrada e **não** concede permissão direta de voto/Buzzer/WebSocket.

## Flyway

Maior migration detectada: **V14**.

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
- `V11` — `enrollment preferred name`.
- `V12` — `enrollment device claims`.
- `V13` — `poll runtime` (`poll_rounds`, `poll_options`, `poll_votes`).
- `V14` — `session events` / linha do tempo operacional.

Live Stage e o hardening 12.6 **não adicionam migration**.

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

## 12.5 — SessionEvent / linha do tempo operacional

- migration `V14__session_events.sql`;
- sequência monotônica para ordenação determinística;
- tipos semânticos e ator `TEACHER`/`SYSTEM`;
- eventos de sessão, condução, Sorteio, grupos, Buzzer, Timer, Nuvem, Poll e Boss;
- sem heartbeat, reconnect, tick, voto, palavra ou press individual;
- expiração natural do Timer registrada uma única vez como evento de sistema;
- API administrativa por turma e por sessão;
- `Histórico → Linha do tempo` separado de `Histórico de XP`;
- timeline somente leitura; reversão continua exclusiva de `ScoreEvent`.

## Validação do checkpoint local — 09/09/2026

Frontend:

```text
npm test          85/85 OK
npm run typecheck OK
npm run build     OK
```

Backend:

```text
compilação Java 21 de todos os fontes main: OK
```

`SessionEventIT` foi adicionado ao conjunto de integração com PostgreSQL/Testcontainers e cobre ordem, ausência de ruído por resposta individual, expiração natural do Timer e reabertura do Buzzer. A compilação Java 21 de todos os fontes `main` está verde.

**Limitação deste ambiente:** Maven e Docker não estão disponíveis, portanto `mvn -B -ntp verify` e `docker compose up -d --build` não foram executados neste checkpoint. 12.5 precisa passar pelo gate backend/Compose no ambiente normal ou CI antes do commit/release.

## Próxima sequência

```text
12.4D Live Stage + identidade + Poll       concluído
↓
12.4E Live Flow ↔ Live Stage              concluído
↓
12.4F /join + Projector + reconnect        concluído
↓
12.5 SessionEvent / linha do tempo         concluído
↓
12.6 hardening + E2E + gate v0.4.0         implementado localmente
↓
release evidence / main / tag v0.4.0       pendente
```

## Gate normal

```bash
cd frontend
npm test
npm run typecheck
npm run build

cd ../backend
mvn -B -ntp verify

cd ..
docker compose up -d --build
sleep 5
docker compose ps
```

## Versionamento

Os manifests e o tooling de release estão alinhados em `0.4.0` desde o 12.6. A tag `v0.4.0` ainda não existe e só pode ser criada após o gate final documentado em `RELEASE_0_4_0.md`.
