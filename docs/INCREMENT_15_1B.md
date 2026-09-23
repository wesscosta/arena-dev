# Incremento 15.1B — Microsoft Graph Class Discovery

## Objetivo
Descobrir turmas remotas do tenant Microsoft conectado sem criar turmas locais nem vínculos automaticamente.

## Endpoint
```text
GET /api/integrations/microsoft/connections/{connectionId}/classes
```

Pré-condições: conexão existente, provider `MICROSOFT_TEAMS`, status `ACTIVE` e `externalTenantId` preenchido.

## Fluxo
```text
IntegrationConnection -> tenantId -> MicrosoftGraphTokenProvider -> access token
-> MicrosoftGraphEducationClient -> GET /education/classes -> @odata.nextLink -> lista completa
```

## Dados retornados
`id`, `displayName`, `classCode`, `externalId`, `externalName`, `description`, `grade`.

## Paginação
`HttpMicrosoftGraphEducationClient` percorre `@odata.nextLink` até o fim.

## Segurança e persistência
Esta etapa não persiste token, resposta bruta do Graph, Classroom local ou ExternalClassroomLink.
Também não sincroniza estudantes nem atividades.

## Permissão
Application permission `EduRoster.Read.All` com admin consent.

## Gate
```bash
cd backend
mvn -B -ntp -Dtest=MicrosoftClassDiscoveryServiceTest,MicrosoftClassDiscoveryControllerTest test
mvn -B -ntp verify
```

## Próxima fatia
**15.1C — Select & Link Microsoft Class**: selecionar explicitamente uma `educationClass` descoberta e criar `ExternalClassroomLink`.
