# Incremento 15.0E — Administrative API

## Objetivo

Expor o Integration Core por uma API administrativa autenticada para o professor,
sem acoplar a API a Microsoft Graph ou Google Classroom.

## Base path

```text
/api/integrations
```

Todas as rotas ficam sob a proteção já existente de `/api/**`:

```text
ROLE_TEACHER + CSRF
```

## Conexões

```text
GET  /api/integrations/connections
GET  /api/integrations/connections/{connectionId}
POST /api/integrations/connections
PUT  /api/integrations/connections/{connectionId}/credential-reference
POST /api/integrations/connections/{connectionId}/activate
POST /api/integrations/connections/{connectionId}/disable
```

A referência de credencial é somente de entrada. Ela nunca é serializada nas respostas.

## Vínculos externos

```text
POST /api/integrations/connections/{connectionId}/classroom-links
POST /api/integrations/connections/{connectionId}/student-links
POST /api/integrations/connections/{connectionId}/activity-links
POST /api/integrations/connections/{connectionId}/submission-links
```

## Sincronização

```text
POST /api/integrations/connections/{connectionId}/sync-executions
GET  /api/integrations/sync-executions/{executionId}

POST /api/integrations/sync-executions/{executionId}/start
POST /api/integrations/sync-executions/{executionId}/succeed
POST /api/integrations/sync-executions/{executionId}/partial
POST /api/integrations/sync-executions/{executionId}/fail
POST /api/integrations/sync-executions/{executionId}/cancel

POST /api/integrations/sync-executions/{executionId}/items
POST /api/integrations/sync-items/{itemId}/start
POST /api/integrations/sync-items/{itemId}/succeed
POST /api/integrations/sync-items/{itemId}/fail
```

## Checkpoints

```text
GET /api/integrations/connections/{connectionId}/checkpoints/{scope}
PUT /api/integrations/connections/{connectionId}/checkpoints/{scope}
```

## Erros

A API traduz regras do Integration Core para `ProblemDetail`:

```text
404 IntegrationNotFoundException
400 IllegalArgumentException
409 IllegalStateException
```

## Fora de escopo

- OAuth;
- Microsoft Graph;
- Google Classroom API;
- descoberta automática de turma;
- sincronização real com provider;
- UI.

O próximo incremento do bloco 15.0 é **15.0F — Fake Adapter, Contract Tests & Closeout**.
