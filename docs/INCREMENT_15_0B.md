# Incremento 15.0B — Integration Domain

## Objetivo

Materializar o bounded context provider-independent definido no 15.0A sem
alterar ainda o schema V25 e sem introduzir OAuth, Microsoft Graph ou Google API.

## O que entra

- pacote `br.com.arenadev.integration`;
- `LearningPlatformProvider` canônico com `MICROSOFT_TEAMS` e `GOOGLE_CLASSROOM`;
- `IntegrationConnection`;
- `ExternalClassroomLink`;
- `ExternalStudentLink`;
- `ExternalActivityLink`;
- `ExternalSubmissionLink`;
- `SyncExecution`;
- `SyncItem`;
- `SyncCheckpoint`;
- `IntegrationCredentialStore`;
- capabilities provider-independent;
- contrato base `LearningPlatformAdapter`;
- testes unitários do novo domínio.

## Compatibilidade com V25

O V25 ainda armazena `TEAMS` nos vínculos legados. Por isso o 15.0B não altera
migrations, mantém temporariamente os contratos legados e adiciona
`SubmissionSource.EXTERNAL`.

A conversão persistente para `MICROSOFT_TEAMS` fica para o 15.0C/V26.

## Fronteiras congeladas

```text
provider != connection
external mapping != sync execution
ActivitySubmission != provider contract
credential != domain entity
external id uniqueness = connection scoped
```

## Fora de escopo

- V26;
- JPA/repositories das novas entidades;
- endpoints administrativos novos;
- OAuth;
- Microsoft Graph;
- Google Classroom API;
- execução real de sincronização;
- remoção física dos contratos V25.

## Gate

```bash
cd backend
mvn -B -ntp test
mvn -B -ntp verify
```

Depois do gate verde, o próximo incremento é **15.0C — Persistence / V26**.
