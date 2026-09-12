# Estado atual — Arena Dev

**Última sincronização documental:** 10 de setembro de 2026

**Release estável:** `v0.4.0 — Live Classroom`.

**Linha ativa:** `v0.5.0 — Live Quiz & Structured Responses`.

**Branch de desenvolvimento:** `feat/v0.5-live-quiz`.

**Checkpoint:** `13.4 — Avaliação automática + ScoreEvent implementado para validação`.

Este arquivo é a referência técnica versionada do estado corrente.

## Baseline pública v0.4.0

```text
PR final        #9
head do PR      23526d9fdd37e72311272a5c4c29876552e98ccc
merge main      ccfb7f937e7ac7db330cfa5e54c3e3816b69962f
CI final        34428450704 — SUCCESS
tag             v0.4.0
schema          Flyway V1–V14
```

A tag `v0.4.0` está congelada.

## Stack

| Camada | Estado |
| --- | --- |
| Frontend | Next.js 16.3.3, React 19.2, TypeScript 5.9 |
| Backend | Java 21, Spring Boot 4.1 |
| Persistência | PostgreSQL 17, JPA/Hibernate, Flyway |
| Realtime | Spring WebSocket |
| Infra local | Docker Compose |
| Arquitetura | monólito modular |

## Baseline funcional herdada da v0.4

- Timer, Projector e `/join`;
- Word Cloud, Poll, Buzzer, Sorteio e Boss Battle;
- `ActivityStep`, Live Flow e `LiveStageState`;
- reconnect com `RUNTIME_SNAPSHOT`;
- `preferredName` e device claim opaco;
- `SessionEvent` como timeline operacional;
- `ScoreEvent` como fonte de verdade do XP;
- hardening de login, request correlation e health live/ready;
- navegação contextual sem sidebar redundante.

## v0.5 — objetivo

```text
Professor apresenta questão
        ↓
Aluno responde no /join
        ↓
Backend registra resposta
        ↓
Professor acompanha participação
        ↓
Resultado é revelado
        ↓
Avaliação pode gerar ScoreEvent
```

## Invariantes arquiteturais

```text
ActivityQuestion    = autoria da pergunta
QuizRound           = runtime da rodada ao vivo
ParticipantAnswer   = verdade da resposta enviada
ScoreEvent          = verdade do XP
LiveStage           = verdade do que está apresentado
SessionEvent        = projeção cronológica operacional
```

Não criar `QuizScore` como fonte paralela de XP.

Não duplicar `ActivityQuestion` dentro do runtime.

## Escopo incremental

```text
13.0  Bootstrap documental                         concluído
13.1  Quiz Runtime                                 concluído localmente
13.2  Respostas estruturadas no /join                concluído localmente
13.3  Resultados + Projetor                           concluído localmente
13.4  Avaliação + integração com ScoreEvent           implementado; gates pendentes
13.5  Feedback pedagógico                              próximo
13.5  Feedback pedagógico
13.6  Mobile/PWA
13.7  Hardening/E2E + gate v0.5.0
```

## Schema

Maior migration atual: **V15**.

`V15__quiz_runtime.sql` adiciona `quiz_rounds` e `quiz_participant_answers`.

## Versionamento

Os manifests permanecem em `0.4.0` durante o desenvolvimento inicial da v0.5. O bump para `0.5.0` fica reservado ao incremento de fechamento/release.

## Próximo passo

**Gate imediato:** executar frontend (`npm test`, `typecheck`, `build`) e backend (`mvn -B -ntp verify`). Com os gates verdes, fechar 13.4 e avançar para **13.5 — Feedback pedagógico**.
