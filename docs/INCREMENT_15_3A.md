# Incremento 15.3A — Assignment Discovery & Activity Mapping

## Objetivo

Descobrir tarefas (`educationAssignment`) da turma Microsoft já vinculada e
associá-las explicitamente às atividades existentes do Arena Dev.

Nenhuma atividade local é criada automaticamente.

## Microsoft Graph

Consulta:

```text
GET /education/classes/{id}/assignments
```

Permissão mínima de aplicação:

```text
EduAssignments.ReadBasic.All
```

com consentimento administrativo.

A leitura segue `@odata.nextLink`.

## Dados remotos normalizados

- id;
- classId;
- displayName;
- status;
- assignedDateTime;
- dueDateTime;
- webUrl.

## Endpoints Arena

```text
GET  /api/integrations/microsoft/connections/{connectionId}/class-links/{classroomLinkId}/activity-mapping
POST /api/integrations/microsoft/connections/{connectionId}/class-links/{classroomLinkId}/activity-mapping
```

## Regras de vínculo

- a atividade local deve pertencer à mesma turma Arena do `ExternalClassroomLink`;
- a assignment deve existir na leitura atual do Graph;
- repetir o mesmo vínculo é idempotente;
- uma atividade local não pode apontar para outra assignment silenciosamente;
- uma assignment já vinculada não pode ser associada a outra atividade local.

## UI

O console ganha o bloco:

```text
07 — Atividades e tarefas
```

O professor pode:

1. listar assignments do Teams;
2. visualizar status e prazo;
3. selecionar uma atividade Arena da mesma turma;
4. criar o vínculo explicitamente;
5. abrir o deep link da assignment quando disponível.

## Fora de escopo

- criação de assignment no Teams;
- criação automática de Activity local;
- leitura de submissions;
- notas e feedback.

## Gate

```bash
cd backend
mvn -B -ntp -Dtest=MicrosoftActivityMappingServiceTest test
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

15.4 — Submission Import.
