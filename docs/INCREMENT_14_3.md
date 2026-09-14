
# Incremento 14.3 — Dashboard de entregas do professor

## Objetivo
Permitir ao professor enxergar uma atividade inteira da turma em uma única projeção, sem planilha ou controle paralelo.

## Decisão central
`NOT_STARTED` continua sendo derivado da matrícula ativa sem `ActivitySubmission`.

## Endpoint
`GET /api/activities/{activityId}/submissions/dashboard`

A projeção combina atividade, matrículas ativas, última tentativa de cada matrícula, quantidade de `SubmissionItem` e status da entrega.

## Status
`NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `GRADED`, `RETURNED`.

## Interface
A aba Atividades passa a oferecer **Entregas**, com contadores e filtros. O fluxo legado de pontuação fica explicitamente como **Registrar XP manual**.

## Fora de escopo
Correção, rubrica, nota, feedback, IA e transição para `UNDER_REVIEW` ficam no 14.4+.

## Critérios de aceite
- aluno sem submissão aparece como `NOT_STARTED`;
- matrículas inativas não entram no painel;
- filtros não alteram a fonte de verdade;
- `ScoreEvent` permanece independente;
- nenhuma migration nova;
- backend e frontend com gates verdes.

## Próximo incremento
**14.4 — Correção individual**, usando `submissionId` exposto pelo dashboard.
