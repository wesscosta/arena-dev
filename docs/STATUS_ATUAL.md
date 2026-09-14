# Estado atual — Arena Dev

**Última sincronização documental:** 13 de setembro de 2026

**Release estável:** `v0.5.0 — Live Quiz & Structured Responses`.

**Linha ativa:** `v0.6.0 — Submissions, Assessment & Feedback`.

**Branch de desenvolvimento:** `feat/v0.6-submissions-assessment`.

**Checkpoint:** `14.0 — Bootstrap e arquitetura`.

Este arquivo é a referência técnica versionada do estado corrente.

## Baseline pública v0.5.0

```text
PR final        #10
merge main      55c76e96cb3726fbe7fee0bd09f26ad8ce43ccfe
tag             v0.5.0
schema          Flyway V1–V17
```

A tag `v0.5.0` está congelada e não deve ser movida.

## Objetivo da v0.6

A v0.6 resolve o fluxo completo:

```text
Activity
   ↓
ActivitySubmission
   ↓
SubmissionAnswer
   ↓
Assessment
   ↓
feedback supervisionado
   ↓
publicação ao aluno
```

O gargalo prioritário é permitir ao professor identificar quem entregou, revisar cada entrega individualmente, usar IA para acelerar correção e feedback e publicar somente após revisão explícita.

## Invariantes arquiteturais herdadas

```text
ActivityQuestion    = autoria da pergunta
QuizRound           = runtime ao vivo
ParticipantAnswer   = resposta do Quiz
ScoreEvent          = verdade do XP
LiveStage           = verdade do que está apresentado
SessionEvent        = projeção cronológica operacional
```

A v0.6 acrescentará, sem substituir essas fontes:

```text
ActivitySubmission  = verdade da entrega de uma atividade
SubmissionAnswer    = resposta persistida dentro da entrega
Assessment          = avaliação da entrega
```

## Regra de supervisão da IA

Nenhuma nota, feedback ou devolutiva produzida por IA pode ser publicada automaticamente.

Toda saída de IA nasce como sugestão/rascunho e exige ação explícita do professor antes de ficar visível ao aluno.

Somente feedback publicado poderá ser sincronizado futuramente com Microsoft Teams ou Google Classroom.

## Preparação para integrações institucionais

Arena Dev permanece a fonte de verdade da entrega e da avaliação.

Teams/Classroom serão adapters de integração para:

- sincronização de turma/identidade;
- publicação de atividade/deep link;
- sincronização futura de nota e feedback publicado.

A v0.6 não implementa ainda a integração completa.

## Escopo incremental

```text
14.0  Bootstrap e arquitetura                              concluído
14.1  ActivitySubmission                                      concluído
14.2  SubmissionItem, autosave e envio                           implementação local
14.2  Fluxo de entrega do aluno
14.3  Dashboard de entregas
14.4  Correção individual
14.5  Rubricas e avaliação estruturada
14.6  AI-assisted grading
14.7  Feedback individual
14.8  Correção em lote / triagem
14.9  Evidências de processo e integridade
14.10 Preparação para Teams/Classroom
14.11 Hardening, E2E e release gate
```

## Schema

Maior migration atual: **V17**.

O incremento 14.0 não cria migration.

A primeira migration da v0.6 só deve surgir quando o modelo persistente de `ActivitySubmission` for fechado no 14.1.

## Versionamento

Durante desenvolvimento, os manifests e o release tooling usam `0.6.0-SNAPSHOT`.

Isso diferencia a linha ativa da tag estável `v0.5.0`.

## Próximo passo

Concluir o 14.0 validando:

- branch `feat/v0.6-submissions-assessment`;
- metadata `0.6.0-SNAPSHOT` alinhada;
- `ROADMAP_0_6.md`;
- `INCREMENT_14_0.md`;
- ADR do domínio de submissões;
- índice documental/ADR atualizados;
- gates básicos de metadata.

Depois iniciar **14.1 — ActivitySubmission**.
