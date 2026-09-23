# Incremento 15.8A — Integration Health & Conflict Queue

Torna visíveis os dados persistidos em `sync_executions`, `sync_items` e `sync_checkpoints`.

Novo endpoint:

```text
GET /api/integrations/connections/{connectionId}/observability
```

A Central de Operação passa a mostrar saúde de sincronização e conflitos para revisão.
Nenhuma correção é automática.

Estados: `NO_HISTORY`, `HEALTHY`, `ATTENTION`, `ERROR`, `SYNCING`.

Limite: os fluxos Microsoft ainda não passam todos pelo `SyncExecutionService`; operações antigas podem aparecer como `NO_HISTORY`.

Próximo incremento: **15.8B — Automatic Sync Telemetry**.

## Hardening 15.8A.1

- falha de observabilidade não impede o carregamento das turmas;
- conflitos distinguem `não avaliado` de `0 conflitos`;
- `CANCELLED` é classificado como `ATTENTION`;
- `PENDING/RUNNING` com mais de 30 minutos é tratado como obsoleto;
- `lastSuccessAt` consulta o último sucesso real fora da janela das dez execuções.

