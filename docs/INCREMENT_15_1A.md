# Incremento 15.1A — Microsoft Identity Foundation

## Objetivo

Iniciar a integração real com Microsoft Teams/Microsoft Graph usando autenticação
app-only (OAuth 2.0 client credentials).

## Fluxo

- Azure Identity obtém token com scope `https://graph.microsoft.com/.default`;
- o Arena Dev valida acesso em `GET /education/classes`;
- cria/reutiliza a `IntegrationConnection` MICROSOFT_TEAMS;
- persiste somente `microsoft-entra://client-credentials` como referência opaca;
- ativa a conexão após o probe.

## Configuração

```text
app.integrations.microsoft.client-id
app.integrations.microsoft.client-secret
```

## API

```text
GET  /api/integrations/microsoft/readiness
POST /api/integrations/microsoft/connect
```

## Gate

```bash
cd backend
mvn -B -ntp -Dtest=MicrosoftIdentityConnectionServiceTest,MicrosoftTeamsAdapterContractTest test
mvn -B -ntp verify
```

## Próxima etapa

15.1B — Microsoft Graph client + tenant/class discovery.
