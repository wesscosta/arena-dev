# Incremento 14.5 — Rubricas e avaliação estruturada

## Objetivo

Transformar a correção individual em avaliação pedagógica auditável, com critérios explícitos e pontuação independente de XP.

## Modelo

```text
Activity
  └─ ActivityRubricCriterion (template ativo)

ActivitySubmission
  └─ SubmissionAssessment
      └─ AssessmentCriterion (snapshot)
```

A rubrica da atividade funciona como template. Quando uma entrega entra em avaliação, os critérios são copiados para `AssessmentCriterion`, preservando título, descrição e pontuação máxima usados naquela correção.

## Fonte de verdade

- nota/avaliação: `SubmissionAssessment + AssessmentCriterion`;
- XP: `ScoreEvent`;
- não existe conversão automática de nota em XP neste incremento.

## Estados

A conclusão da rubrica executa:

```text
UNDER_REVIEW -> GRADED
```

A operação exige:

- ao menos um critério;
- todos os critérios pontuados;
- `0 <= awardedPoints <= maxPoints` em cada critério.

## Interface

Dentro da correção individual o professor pode:

- definir a rubrica quando ainda não existe snapshot;
- criar vários critérios;
- definir pontuação máxima;
- registrar observação por critério;
- acompanhar total obtido / total possível;
- concluir a correção.

## Migration

`V21__assessment_rubrics.sql`

Cria:

- `activity_rubric_criteria`;
- `assessment_criteria`.

## Limites

Ainda não entram:

- IA sugerindo pontuação;
- feedback publicado ao aluno;
- XP automático;
- sync com Teams/Classroom.

Esses pontos permanecem nos incrementos seguintes.
