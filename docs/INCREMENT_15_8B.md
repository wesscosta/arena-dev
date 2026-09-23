# Incremento 15.8B — Automatic Sync Telemetry

## Objetivo

Conectar operações reais do Microsoft Teams à infraestrutura de observabilidade
do 15.8A.

## Fluxo

```text
Operação Microsoft
        ↓
SyncTelemetryRunner
        ↓
SyncTelemetryStore (REQUIRES_NEW)
        ↓
SyncExecution / SyncItem
        ↓
Observability UI
```

`REQUIRES_NEW` garante que a falha registrada sobreviva ao rollback da transação
de negócio.

## Operações instrumentadas

- `ROSTER` / `IMPORT`;
- `ACTIVITIES` / `IMPORT`;
- `SUBMISSIONS` / `IMPORT`;
- `ASSESSMENT_PUBLISH` / `EXPORT`.

Cada chamada cria uma nova `SyncExecution`, evitando reutilizar uma execução
anterior apenas porque ainda está aberta.

## Deliberadamente fora desta fatia

- matching preview, porque reutiliza o roster;
- reconciliação local, porque reutiliza o roster;
- aplicação local de feedback/pontos, porque não cruza a fronteira com o Graph;
- Google Classroom, mantido em standby.

## Próximo passo

15.8C — drill-down de falhas e refresh da saúde na UI após operações.
