# Incremento 15.5A — Microsoft Grade & Feedback Preview

## Objetivo

Ler a avaliação associada a uma submissão já importada do Microsoft Teams sem
alterar automaticamente a avaliação local do Arena.

## Microsoft Graph

A avaliação de uma `educationSubmission` é representada por `educationOutcome`.

Nesta fatia são considerados:

- `educationPointsOutcome`;
- `educationFeedbackOutcome`.

O Arena lê:

- `points`;
- `publishedPoints`;
- `feedback`;
- `publishedFeedback`;
- `lastModifiedDateTime`.

## Segurança

A consulta só é permitida quando já existe um `ExternalSubmissionLink`.

Assim, uma submissão remota precisa primeiro passar pelo fluxo supervisionado do
15.4B e possuir uma entrega Arena correspondente.

Nenhum `SubmissionAssessment`, critério, nota ou feedback local é alterado pelo
preview.

## Permissão Microsoft

A leitura de outcomes requer:

```text
Delegated: EduAssignments.Read
Application: EduAssignments.Read.All
```

Isso é mais amplo que `EduAssignments.ReadBasic`, necessário apenas para
metadados básicos de assignments/submissions.

## Endpoint

```text
GET /api/integrations/microsoft/connections/{connectionId}
    /class-links/{classroomLinkId}
    /activity-links/{activityLinkId}
    /submissions/{microsoftSubmissionId}/outcomes
```

## UI

Para uma entrega já importada:

```text
[ Ver avaliação Teams ]
```

O preview mostra separadamente o valor atual do professor no Teams e o valor já
publicado ao aluno.

Nada é aplicado ao Arena neste incremento.

## Próximos slices

- 15.5B — Supervised Apply to Arena
- 15.5C — Write Grade & Feedback to Microsoft Teams
