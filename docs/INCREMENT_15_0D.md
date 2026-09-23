# Incremento 15.0D — Application Services

## Objetivo

Colocar o Integration Core V26 atrás de casos de uso transacionais e
provider-independent, ainda sem endpoints administrativos e sem adapters reais.

## Serviços

### IntegrationConnectionService

- cria conexão;
- reaproveita conexão existente quando `provider + externalTenantId` já existe;
- associa referência opaca de credencial;
- ativa;
- desabilita.

### ExternalLinkService

Materializa os vínculos:

```text
Classroom   ↔ ExternalClassroom
Enrollment  ↔ ExternalStudent
Activity    ↔ ExternalActivity
Submission  ↔ ExternalSubmission
```

Todos os vínculos são isolados por `connectionId`.

### SyncExecutionService

Gerencia abertura, execução, itens, sucesso, sucesso parcial, falha e cancelamento.

### SyncCheckpointService

Mantém cursor opaco por:

```text
connectionId + scope
```

## Idempotência

O 15.0D não adiciona migration nova.

A idempotência usa as chaves naturais já materializadas na V26:

```text
connection + classroom
connection + enrollment
connection + activity
connection + submission
execution + itemType + itemKey
```

Uma execução ainda `PENDING` ou `RUNNING` com o mesmo:

```text
connectionId + scope + direction
```

é reutilizada.

## Fora de escopo

- REST administrativa;
- OAuth;
- Microsoft Graph;
- Google Classroom API;
- agendamento/polling;
- retry/backoff provider-specific;
- UI de integrações.

## Gate

```bash
cd backend
mvn -B -ntp test
mvn -B -ntp verify
```

Após o gate verde, o próximo incremento é **15.0E — Administrative API**.
