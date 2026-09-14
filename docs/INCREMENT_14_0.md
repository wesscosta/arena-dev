# Incremento 14.0 — Bootstrap e arquitetura da v0.6.0

## Objetivo

Abrir formalmente a linha `v0.6.0 — Submissions, Assessment & Feedback` sobre a baseline pública `v0.5.0`.

Este incremento é documental/arquitetural e de metadata. Ele **não cria novas tabelas, endpoints ou migrations**.

## Baseline

```text
release estável  v0.5.0
main             55c76e96cb3726fbe7fee0bd09f26ad8ce43ccfe
schema máximo    V17
branch           feat/v0.6-submissions-assessment
metadata dev     0.6.0-SNAPSHOT
```

## Entregas

- [x] definir nome e objetivo da linha;
- [x] criar roadmap v0.6;
- [x] criar ADR do domínio de submissões;
- [x] atualizar `STATUS_ATUAL.md`;
- [x] atualizar índice documental e ADR;
- [x] alinhar Maven/npm/package-lock/release tooling em `0.6.0-SNAPSHOT`;
- [x] preservar `v0.5.0` como tag/release congelada;
- [x] registrar integração Teams/Classroom como fronteira futura;
- [x] registrar supervisão humana obrigatória sobre IA.

## Decisões

### Fonte de verdade da entrega

`ActivitySubmission` será a fonte de verdade de uma entrega de atividade.

`ParticipantAnswer` continua pertencendo exclusivamente ao runtime de Quiz.

### Fonte de verdade do XP

`ScoreEvent` permanece o ledger exclusivo de XP.

Avaliações podem gerar `ScoreEvent` posteriormente, mas não criam uma segunda fonte de XP.

### IA

A IA é assistiva.

Toda nota/feedback gerados por IA começam como rascunho e só ficam visíveis ao aluno após decisão explícita do professor.

### Teams/Classroom

Integrações institucionais serão adapters futuros.

O domínio interno não deve depender de Microsoft Graph ou Google Classroom.

## Contrato conceitual para 14.1

```text
ActivitySubmission
├── id
├── activityId
├── enrollmentId
├── status
├── source
├── attemptNumber
├── startedAt
├── submittedAt
└── returnedAt
```

Estados iniciais a validar no 14.1:

```text
IN_PROGRESS
SUBMITTED
UNDER_REVIEW
GRADED
RETURNED
```

`NOT_STARTED` tende a ser projeção derivada da ausência de submissão, não necessariamente uma linha persistida. Essa decisão deve ser fechada no 14.1.

## Critérios de aceite

- branch criada a partir de `main`;
- metadata alinhada em `0.6.0-SNAPSHOT`;
- documentação corrente aponta v0.6 como linha ativa;
- roadmap v0.6 disponível;
- ADR-0043 aceito;
- nenhuma migration nova;
- `scripts/release/check-metadata.sh` verde;
- testes existentes não devem sofrer regressão por alterações de metadata/documentação.

## Próximo incremento

**14.1 — ActivitySubmission**: fechar invariantes, schema, migration e API mínima.
