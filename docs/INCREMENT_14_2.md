# Incremento 14.2 — SubmissionItem, autosave e envio

## Objetivo

Permitir conteúdo real de uma entrega sem assumir que toda atividade é um Quiz.

## Modelo

```text
ActivitySubmission
  └── SubmissionItem
       ├── QUESTION_RESPONSE
       ├── TEXT
       ├── LINK
       ├── CODE
       ├── FILE
       └── ARTIFACT
```

A V19 cria `submission_items`.

## Autosave

```text
PUT /api/activities/{activityId}/submissions/{submissionId}/items/{itemId}
```

O cliente gera o UUID do item. Repetir o `PUT` atualiza o mesmo item.

## Restauração

```text
GET /api/activities/{activityId}/submissions/{submissionId}
```

retorna o envelope da submissão e os itens persistidos.

## Envio

```text
POST /api/activities/{activityId}/submissions/{submissionId}/submit
```

Transição:

```text
IN_PROGRESS → SUBMITTED
```

Após o envio, a entrega deixa de aceitar alterações.

## Regras

- `QUESTION_RESPONSE` exige `questionId`;
- a questão precisa pertencer à atividade;
- outros tipos não carregam `questionId`;
- conteúdo é armazenado como JSON;
- limite inicial de 1 MB por item;
- `FILE` e `ARTIFACT` representam metadados/referência nesta etapa;
- upload binário e storage ficam para incremento posterior;
- `ScoreEvent` continua intocado.

## Próximo incremento

**14.3 — Dashboard de entregas do professor.**
