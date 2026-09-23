# Incremento 15.4A — Submission Discovery & Delivery Tracking

## Objetivo

Ler as `educationSubmission` de uma assignment Microsoft já mapeada e
apresentar no Arena Dev quem entregou, quem está pendente, quem foi dispensado e
quem ainda não possui vínculo local seguro.

Esta fatia é somente leitura.

## Microsoft Graph

```text
GET /education/classes/{classId}/assignments/{assignmentId}/submissions
```

Permissão mínima de aplicação:

```text
EduAssignments.ReadBasic.All
```

A consulta segue `@odata.nextLink`.

## Identificação do aluno

Para submissões individuais, o Graph informa:

```text
recipient.userId
```

Esse identificador é relacionado ao `ExternalStudentLink.externalUserId`.

## Classificação

```text
submitted / returned -> DELIVERED
working / reassigned -> PENDING
excused              -> EXCUSED
sem ExternalStudentLink -> UNMATCHED
```

A classificação é de acompanhamento operacional. O status original do Graph
também é retornado pela API.

## Endpoint Arena

```text
GET /api/integrations/microsoft/connections/{connectionId}/class-links/{classroomLinkId}/activity-links/{activityLinkId}/submissions
```

## UI

No bloco `07 — Atividades e tarefas`, atividades já mapeadas recebem a ação:

```text
Ver entregas
```

O console ganha:

```text
08 — Entregas individuais
```

com métricas de entregues, pendentes, dispensados e não associados, além de uma
linha por submission.

## Fora de escopo

Ainda não:

- cria `ActivitySubmission`;
- persiste `ExternalSubmissionLink`;
- importa anexos/submittedResources;
- importa nota;
- envia feedback.

Essas escritas entram na próxima subfatia após validação do tracking.

## Gate

```bash
cd backend
mvn -B -ntp -Dtest=MicrosoftSubmissionTrackingServiceTest test
mvn -B -ntp verify

cd ../frontend
npm test
npm run typecheck
npm run build

cd ..
docker compose up -d --build
docker compose ps
```

## Próxima etapa

15.4B — Persist External Submissions.
