# 12.5 — SessionEvent / linha do tempo operacional

**Data:** 09/09/2026  
**Status:** implementado localmente; gate Maven/Compose pendente no ambiente normal.

## Objetivo

Adicionar uma trilha cronológica auditável da aula sem transformar histórico em um segundo runtime e sem misturá-lo com XP.

```text
Domínios autoritativos                  Projeção histórica
─────────────────────                  ──────────────────
ScoreEvent ────────────────┐
PollRound ─────────────────┤
WordCloudRound ────────────┤
BuzzerRound ───────────────┼──► SessionEvent
SessionTimer ──────────────┤       somente fatos relevantes
ActivityStep / Live Flow ──┤
Boss / mecânicas ──────────┘
```

Princípio: **`SessionEvent` registra o que aconteceu; não passa a decidir o que está acontecendo.**

## Persistência — V14

Foi adicionada `V14__session_events.sql` com:

- UUID do evento;
- referência à `ClassSession`;
- `sequence_no` monotônico para ordenação estável;
- tipo semântico;
- ator (`TEACHER` ou `SYSTEM`);
- resumo histórico;
- payload JSON textual de contexto;
- `occurred_at`.

A sequência é usada como ordenação determinística mesmo quando operações próximas possuem timestamps equivalentes. Gaps por rollback são aceitáveis; `sequence_no` é ordenação, não contador de negócio.

## Eventos registrados

### Sessão

- `SESSION_STARTED`;
- `SESSION_FINISHED`.

### Condução

- `ARENA_SOURCE_SELECTED`;
- `ARENA_SOURCE_CLEARED`;
- `ARENA_QUESTION_PRESENTED`;
- `ARENA_QUESTIONS_RESTARTED`;
- `FLOW_STARTED`;
- `FLOW_STEP_CHANGED`.

### Dinâmicas e organização

- `DRAW_COMPLETED`;
- `GROUPS_ORGANIZED`;
- `BUZZER_OPENED`;
- `BUZZER_CLOSED`;
- `WORD_CLOUD_OPENED`;
- `WORD_CLOUD_REVEALED`;
- `WORD_CLOUD_CLOSED`;
- `POLL_OPENED`;
- `POLL_REVEALED`;
- `POLL_CLOSED`;
- `BOSS_STARTED`;
- `BOSS_DEFEATED`.

### Tempo

- `TIMER_STARTED`;
- `TIMER_PAUSED`;
- `TIMER_RESUMED`;
- `TIMER_EXTENDED`;
- `TIMER_FINISHED`;
- `TIMER_CANCELLED`.

Expiração natural do Timer é registrada como `TIMER_FINISHED` com ator `SYSTEM` e `reason=ELAPSED` quando o backend materializa a transição persistida.

## O que deliberadamente não gera evento

Para manter a timeline legível, não são registrados:

- heartbeat;
- connect/reconnect;
- tick de Timer;
- cada voto de Poll;
- cada submissão de Word Cloud;
- cada acionamento do Buzzer;
- cada dano intermediário do Boss;
- frames WebSocket;
- leituras de snapshot/reconnect.

O fechamento implícito de uma rodada de Buzzer ao abrir outra **é** registrado, pois altera semanticamente o ciclo da dinâmica.

## API administrativa

```text
GET /api/session-events?classroomId={classroomId}&limit=200
GET /api/sessions/{sessionId}/events
```

- consulta por turma: mais recentes primeiro, limite padrão `200`, máximo `500`;
- consulta por sessão: ordem cronológica crescente;
- timeline é somente leitura;
- mutações/reversões de XP permanecem em `ScoreEvent`.

## Histórico da turma

A tela `Histórico` passa a separar explicitamente:

```text
Histórico
├── Linha do tempo
│   └── condução, dinâmicas e acontecimentos da aula
└── Histórico de XP
    └── ScoreEvent, auditoria e reversão
```

A timeline mostra:

- resumo do acontecimento;
- sessão;
- ator (`Professor`/`Sistema`);
- data/hora;
- categoria visual;
- busca textual e atualização manual.

O conjunto histórico não usa `aria-live`, evitando que leitores de tela anunciem dezenas ou centenas de registros após uma atualização.

## Regras arquiteturais

1. `ScoreEvent` continua sendo a fonte de verdade de XP.
2. `SessionEvent` não altera Poll, Nuvem, Buzzer, Timer, Boss ou Live Flow.
3. Payload é contexto histórico, não estado reexecutável.
4. Eventos são gravados na mesma transação das operações de domínio quando chamados pelos serviços autoritativos.
5. Respostas individuais não devem inflar a timeline.
6. Timeline não oferece reversão operacional.
7. Novos tipos devem representar fatos pedagogicamente/operacionalmente relevantes, não detalhes técnicos.

## Testes

Frontend:

```text
npm test          85/85 OK
npm run typecheck OK
npm run build     OK
```

A suíte cobre também:

- endpoints de SessionEvent;
- limite máximo de timeline;
- separação Timeline × Histórico de XP;
- contexto de ator;
- ausência de `aria-live` sobre a lista histórica.

Backend `main`:

```text
javac --release 21 OK
```

`SessionEventIT` cobre:

- ordem semântica dos eventos de Poll/Nuvem/Timer/Buzzer/Sorteio/sessão;
- ausência de evento por voto ou submissão individual;
- ordenação por `sequence_no`;
- limite e ordem recente por turma;
- expiração natural do Timer registrada uma única vez como `SYSTEM`;
- fechamento implícito do Buzzer antes de uma nova rodada.

O gate completo `mvn -B -ntp verify` e Docker Compose/Testcontainers permanece obrigatório no ambiente normal antes do commit.

## Próximo

```text
12.6 — Hardening / E2E / segurança / observabilidade / gate v0.4.0
```
