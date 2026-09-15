
# Incremento 14.1 — ActivitySubmission

## Objetivo
Criar a fonte de verdade persistente de uma entrega individual de atividade.

## Decisões
- `ActivitySubmission` pertence a `Activity` e `Enrollment`.
- `NOT_STARTED` é derivado da ausência de submissão.
- A primeira submissão nasce em `IN_PROGRESS`.
- Origem inicial operacional: `ARENA`.
- O contrato reserva `TEAMS`, `GOOGLE_CLASSROOM` e `IMPORT`.
- A API do 14.1 opera apenas `attemptNumber = 1`.
- `ParticipantAnswer` do Quiz não é reutilizado.
- `ScoreEvent` permanece intocado.

## Migration V18
Tabela `activity_submissions` com unicidade por `(activity_id, enrollment_id, attempt_number)` e estados `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `GRADED`, `RETURNED`.

## API mínima
```text
POST /api/activities/{activityId}/submissions
GET  /api/activities/{activityId}/submissions
GET  /api/activities/{activityId}/submissions/{submissionId}
```

## Invariantes
1. atividade e matrícula existem;
2. matrícula está ativa;
3. matrícula pertence à turma da atividade;
4. tentativa é positiva;
5. `IN_PROGRESS` não possui `submitted_at`;
6. estados posteriores exigem `submitted_at`;
7. `RETURNED` exige `returned_at`.

## Fora de escopo
`SubmissionAnswer`, autosave, envio, reabertura, múltiplas tentativas operacionais, rubricas, avaliação, feedback, IA e integração real com Teams/Classroom.

## Critérios de aceite
- Flyway V1–V18 em PostgreSQL 17;
- schema JPA válido;
- start idempotente para a mesma atividade/matrícula/tentativa;
- matrícula inativa ou de outra turma rejeitada;
- `mvn -B -ntp verify` verde.

## Próximo incremento
**14.2 — Fluxo de entrega do aluno:** `SubmissionAnswer`, autosave, restauração e submissão.
