# Incremento 15.2A — Microsoft Teams Roster Discovery

## Objetivo

Ler o roster da `educationClass` já vinculada ao Arena Dev e normalizar os
membros Microsoft antes de qualquer criação ou associação automática de alunos.

## Endpoint

```text
GET /api/integrations/microsoft/connections/{connectionId}/class-links/{classroomLinkId}/roster
```

## Microsoft Graph

A consulta utiliza:

```text
GET /education/classes/{id}/members
```

Permissão app-only mínima:

```text
EduRoster.Read.All
```

com consentimento administrativo.

## Dados normalizados

Cada membro retorna:

```text
id
displayName
givenName
surname
userPrincipalName
primaryRole
externalId
```

`externalId` é extraído do bloco educacional `student` ou `teacher`, conforme
o papel informado pelo Graph.

## Paginação

O client segue `@odata.nextLink` até o fim do roster.

## Regras

A consulta somente ocorre quando:

- a conexão pertence a `MICROSOFT_TEAMS`;
- a conexão está `ACTIVE`;
- o `ExternalClassroomLink` pertence à mesma conexão;
- a conexão possui `externalTenantId`.

## Segurança

Nenhum access token é persistido ou retornado pela API.

## Fora de escopo

Esta fatia não:

- cria `Student`;
- cria `Enrollment`;
- cria `ExternalStudentLink`;
- desativa estudantes ausentes;
- altera o roster Microsoft.

## Gate

```bash
cd backend
mvn -B -ntp -Dtest=MicrosoftRosterDiscoveryServiceTest,MicrosoftRosterControllerTest test
mvn -B -ntp verify
```

Depois:

```bash
cd ..
docker compose up -d --build
docker compose ps
```

## Próxima fatia

**15.2B — Student Matching Preview**

Comparar o roster remoto com estudantes e matrículas existentes e apresentar
uma prévia explícita de:

- correspondências seguras;
- novos estudantes;
- ambiguidades;
- conflitos;
- membros ignorados por não serem estudantes.

Nenhuma alteração local ocorrerá antes dessa prévia.
