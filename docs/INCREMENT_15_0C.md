# Incremento 15.0C — Persistence / V26

## Objetivo

Persistir o Integration Core definido no 15.0B e migrar de forma segura os
vínculos provider-specific criados no V25.

## Migration

`V26__integration_core_persistence.sql`

Cria:

- `integration_connections`;
- `external_classroom_links`;
- `external_student_links`;
- `external_activity_links`;
- `external_submission_links`;
- `sync_executions`;
- `sync_items`;
- `sync_checkpoints`.

## Compatibilidade V25 → V26

As tabelas `activity_provider_links` e `submission_provider_links` não são
removidas neste incremento.

Quando existem dados V25, a migration cria conexões legadas determinísticas:

```text
TEAMS
→ 00000000-0000-0000-0000-000000000701
→ MICROSOFT_TEAMS

GOOGLE_CLASSROOM
→ 00000000-0000-0000-0000-000000000702
→ GOOGLE_CLASSROOM
```

Essas conexões permanecem `DRAFT` e não possuem credenciais.

## SubmissionSource

A V26 normaliza:

```text
TEAMS             → EXTERNAL
GOOGLE_CLASSROOM  → EXTERNAL
```

e substitui a constraint por:

```text
ARENA
EXTERNAL
IMPORT
```

A origem concreta passa a ser resolvida por `ExternalSubmissionLink`.

## Histórico de sincronização

`ProviderSyncState`, `last_synced_at` e `last_error` permanecem preservados nas
tabelas V25. A V26 não fabrica `SyncExecution` retroativa.

`sync_executions`, `sync_items` e `sync_checkpoints` registram somente
execuções reais realizadas pelo novo Integration Core.

## Segurança

`integration_connections.credential_reference` contém apenas uma referência
opaca. OAuth tokens, refresh tokens e client secrets continuam fora das tabelas
de domínio.

## Gate

```bash
cd backend
mvn -B -ntp test
mvn -B -ntp verify
```

O teste `IntegrationPersistenceMigrationIT` executa V1–V25, insere dados
legados, aplica V26 e verifica preservação e normalização.

Após o gate verde, o próximo incremento é **15.0D — Application Services**.
