# Estado atual — Arena Dev

**Última sincronização documental:** 12 de setembro de 2026

**Release estável:** `v0.4.0 — Live Classroom`.

**Linha ativa:** `v0.5.0 — Live Quiz & Structured Responses`.

**Branch de desenvolvimento:** `feat/v0.5-live-quiz`.

**Checkpoint:** `13.7E — fechamento funcional/UX concluído; gate local completo verde`.

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
13.1  Quiz Runtime                                 concluído
13.2  Respostas estruturadas no /join              concluído
13.3  Resultados + Projetor                        concluído
13.4  Avaliação + integração com ScoreEvent        concluído
13.5  Feedback pedagógico                          concluído
13.6  Mobile/PWA                                   concluído
13.7  Hardening/E2E + gate v0.5.0                  gate local completo verde
13.7A Students UX + identidade visual + V17        concluído
13.7B Finish polish + hard delete seguro           concluído
13.7C Iniciar/Continuar Arena distintos            concluído
13.7D Gerenciar turma como página dedicada         concluído
13.7E Tema Escuro/Claro/Sistema                    concluído
```

## Schema

Maior migration atual: **V17**.

`V15__quiz_runtime.sql` adiciona `quiz_rounds` e `quiz_participant_answers`.

`V16__quiz_evaluation_score_event.sql` adiciona avaliação persistida e vínculo idempotente com `ScoreEvent`.

`V17__classroom_theme_identity.sql` adiciona `theme_color` e `theme_icon` à turma.

## Versionamento

Os manifests e o release tooling estão alinhados em `0.5.0` para o release candidate. Isso não autoriza a tag antes dos gates final e de backup/restore.

## Próximo passo

Versionar README/status/roadmap/release docs no mesmo working tree já validado e criar os commits finais da branch `feat/v0.5-live-quiz`.

Depois:

1. `git push`;
2. abrir PR para `main`;
3. exigir CI verde no SHA final;
4. produzir backup real + SHA-256;
5. executar restore-check PostgreSQL 17 / Flyway V1–V17;
6. registrar ensaio de rollback/restore;
7. executar `scripts/release/release-gate.sh final`;
8. somente então criar a tag anotada `v0.5.0` e publicar a GitHub Release.
