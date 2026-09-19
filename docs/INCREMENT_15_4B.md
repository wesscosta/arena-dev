# Incremento 15.4B — Persist External Submissions

## Objetivo

Transformar uma entrega Microsoft já descoberta e associada com segurança em
uma `ActivitySubmission` do Arena.

## Regras de segurança

A importação continua supervisionada.

Somente é persistida quando:

- a assignment já possui `ExternalActivityLink`;
- a submissão remota está `DELIVERED`;
- existe `ExternalStudentLink`;
- existe matrícula Arena correspondente;
- o professor aciona explicitamente **Importar entrega**.

Não são persistidas neste incremento:

- `PENDING`;
- `EXCUSED`;
- `UNMATCHED`;
- notas;
- feedback;
- anexos/arquivos.

## Persistência

A entrega criada no Arena utiliza:

```text
source = EXTERNAL
status = SUBMITTED
```

E recebe um `ExternalSubmissionLink` que preserva a identidade da submissão
no provider.

## Idempotência

Se o `externalSubmissionId` já estiver associado, a operação retorna a entrega
Arena existente com `changed = false`. Nenhuma segunda entrega é criada.

## Tentativas

Quando for necessária uma nova entrega local, o próximo `attemptNumber`
disponível para a dupla atividade + matrícula é utilizado.

## Endpoint

```text
POST /api/integrations/microsoft/connections/{connectionId}
     /class-links/{classroomLinkId}
     /activity-links/{activityLinkId}
     /submissions/import
```

Payload:

```json
{
  "microsoftSubmissionId": "submission-id"
}
```

## UI

- DELIVERED + associado + ainda não importado → `Importar entrega`
- importado → `Importada`
- PENDING / EXCUSED / UNMATCHED → sem importação

## Próximo incremento

15.5 — Grade & Feedback Sync
