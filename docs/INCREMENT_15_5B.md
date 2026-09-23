# Incremento 15.5B — Supervised Apply to Arena

## Objetivo

Permitir que o professor copie explicitamente nota ou feedback lidos do
Microsoft Teams para a avaliação local do Arena.

O 15.5B não publica nada ao aluno e não escreve no Microsoft Graph.

## Ações

### APPLY_FEEDBACK_DRAFT

Copia o feedback externo para:

```text
SubmissionAssessment.feedbackDraft
```

Nunca altera:

```text
publishedFeedback
feedbackPublishedAt
```

### APPLY_POINTS_SINGLE_CRITERION

A pontuação do Teams é agregada. Por isso, o Arena só a aplica
automaticamente quando a avaliação local possui exatamente um critério.

Se houver múltiplos critérios, a operação é bloqueada. O Arena não distribui
uma pontuação agregada entre critérios sem decisão pedagógica do professor.

## Estado da correção

Se a entrega estiver `SUBMITTED`, a ação supervisionada a move para
`UNDER_REVIEW`.

Nenhuma ação deste incremento chama:

```text
ActivitySubmission.grade()
SubmissionAssessment.publishFeedback()
```

Assim, aplicar um dado externo não equivale a concluir nem publicar a avaliação.

## Fonte dos valores

Para nota:

1. `points`
2. fallback para `publishedPoints`

Para feedback:

1. `feedback`
2. fallback para `publishedFeedback`

## Endpoint

```text
POST /api/integrations/microsoft/connections/{connectionId}
     /class-links/{classroomLinkId}
     /activity-links/{activityLinkId}
     /submissions/{microsoftSubmissionId}
     /outcomes/apply
```

Payload de feedback:

```json
{
  "action": "APPLY_FEEDBACK_DRAFT"
}
```

Payload de pontuação:

```json
{
  "action": "APPLY_POINTS_SINGLE_CRITERION"
}
```

## UI

O preview do 15.5A passa a oferecer ações explícitas:

```text
[ Copiar feedback para rascunho ]
[ Aplicar pontuação no Arena ]
```

A nota só será aceita pelo backend quando houver compatibilidade com uma
rubrica de critério único.

## Próximo incremento

15.5C — Publish Grade & Feedback to Microsoft Teams
