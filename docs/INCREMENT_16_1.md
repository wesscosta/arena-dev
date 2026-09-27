# Incremento 16.1 — Journey Core

## Status

**Em execução** na branch `feat/v0.8-journey-core`.

O `16.0 — Professor Arena Experience` foi integrado à `main` pelo PR #21. O `16.1` inicia o domínio persistente da Jornada sem antecipar Mastery, badges, economia adicional de XP ou a experiência final do aluno.

## Problema

A Arena possui atividades, entregas e mecanismos de aula ao vivo, mas ainda não existe uma estrutura persistente que responda:

- qual é a sequência pedagógica da turma;
- quando uma etapa fica disponível;
- qual evidência conclui uma etapa;
- quanto da sequência um aluno já percorreu.

Sem esse núcleo, qualquer mapa visual de jornada seria apenas apresentação sem uma fonte de verdade de domínio.

## Decisão de domínio

O Journey Core introduz três conceitos persistentes:

1. `Journey` — sequência pertencente a uma turma;
2. `JourneyStage` — etapa ordenada, opcionalmente vinculada a uma atividade;
3. `JourneyStageProgress` — progresso manual persistido por matrícula e etapa.

Conclusões baseadas em atividade não duplicam estado: são derivadas de `ActivitySubmission`, que continua sendo a fonte de verdade da entrega.

## Ciclo da jornada

```text
DRAFT → PUBLISHED → ARCHIVED
```

Após publicação, a estrutura de etapas é protegida para não invalidar progresso já iniciado. Título/descrição podem evoluir sem alterar o contrato de progressão.

## Regras de desbloqueio

- `IMMEDIATE` — etapa disponível independentemente da anterior;
- `PREVIOUS_STAGE_COMPLETED` — etapa depende da conclusão da etapa anterior.

A primeira etapa é sempre normalizada para `IMMEDIATE`.

## Regras de conclusão

- `MANUAL` — conclusão explícita registrada em `journey_stage_progress`;
- `ACTIVITY_SUBMITTED` — concluída quando existe entrega `SUBMITTED`, `UNDER_REVIEW` ou `GRADED` da atividade vinculada;
- `ACTIVITY_GRADED` — concluída quando existe entrega `GRADED` da atividade vinculada.

## Persistência

Migration `V28__journey_core.sql`:

- `journeys`;
- `journey_stages`;
- `journey_stage_progress`.

A migration mantém relações com `classrooms`, `activities` e `enrollments`, sem criar cópias paralelas desses domínios.

## API administrativa inicial

```text
GET    /api/journeys?classroomId={classroomId}
GET    /api/journeys/{id}
POST   /api/journeys
PUT    /api/journeys/{id}
POST   /api/journeys/{id}/publish
POST   /api/journeys/{id}/archive
GET    /api/journeys/{id}/progress/{enrollmentId}
POST   /api/journeys/{id}/stages/{stageId}/progress/{enrollmentId}/start
POST   /api/journeys/{id}/stages/{stageId}/progress/{enrollmentId}/complete

GET    /api/join/{code}/journeys
       X-Participant-Token: <token>
```

## Contrato do participante — segunda fatia

O endpoint público autenticado por token da sessão retorna somente jornadas `PUBLISHED` da turma do participante. O cliente não envia `enrollmentId`: a matrícula é resolvida no backend a partir do token, evitando acesso horizontal a progresso de outro aluno.

Cada jornada pública inclui:

- percentual e contagem de etapas concluídas;
- `currentStage`, calculada como a primeira etapa `IN_PROGRESS` ou `AVAILABLE`;
- lista completa de etapas com estados `LOCKED`, `AVAILABLE`, `IN_PROGRESS` e `COMPLETED`;
- `nextAction` explícita: `WAIT_FOR_PREVIOUS_STAGE`, `OPEN_ACTIVITY`, `COMPLETE_STAGE` ou `NONE`;
- `completedAt` também para conclusões derivadas de `ActivitySubmission`, quando o timestamp pode ser inferido da entrega.

## Experiência do professor — primeira fatia

A turma ganhou a seção **Jornadas**, com editor mínimo para:

- criar rascunho;
- definir título e descrição;
- adicionar, remover e reordenar etapas;
- vincular atividade;
- escolher regra de desbloqueio;
- escolher critério de conclusão;
- publicar;
- arquivar.

A interface bloqueia reestruturação após publicação, acompanhando a regra do backend.

## Fora do 16.1

Não entram neste incremento:

- mapa gamificado final do aluno;
- Learning Resources — reservado ao `16.2`;
- Student Experience — reservado ao `16.3`;
- Skills, Question Attempts e Mastery;
- badges/achievements;
- nova economia de XP;
- revisão espaçada;
- dashboard analítico final do professor.

## Gates atuais

```text
backend compile                OK
backend JourneyCoreIT          OK
backend test suite             86 passed
Flyway V1–V28                  OK
frontend tests                 252 passed
frontend typecheck             OK
frontend production build      OK
participant journey contract   OK
```
