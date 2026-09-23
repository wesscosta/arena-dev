# Incremento 15.2E — Roster Reconciliation & Conflict Resolution

## Objetivo

Detectar divergências entre os vínculos já aplicados no Arena Dev e o roster
atual do Microsoft Teams sem executar mudanças destrutivas automaticamente.

## Estados de reconciliação

- `IN_SYNC`: vínculo e matrícula coerentes;
- `REMOTE_MISSING`: usuário vinculado não aparece mais no roster do Teams;
- `LOCAL_INACTIVE`: usuário ainda aparece no Teams, mas matrícula local está inativa;
- `BROKEN_LINK`: vínculo aponta para matrícula inexistente.

## Ações supervisionadas

### REMOTE_MISSING

O professor pode executar:

```text
DEACTIVATE_ENROLLMENT
```

A matrícula fica inativa, mas `Student` e `ExternalStudentLink` são preservados.

### LOCAL_INACTIVE

O professor pode executar:

```text
REACTIVATE_ENROLLMENT
```

## Resolução ambígua

A UI passa a permitir selecionar explicitamente um aluno local para casos
`AMBIGUOUS`, usando o contrato `LINK_EXISTING_STUDENT` criado no 15.2D.

`CONFLICT` continua bloqueado porque envolve vínculo pré-existente divergente e
não deve ser sobrescrito silenciosamente.

## Endpoints

```text
GET  /api/integrations/microsoft/connections/{connectionId}/class-links/{classroomLinkId}/reconciliation
POST /api/integrations/microsoft/connections/{connectionId}/class-links/{classroomLinkId}/reconciliation/{externalStudentLinkId}
```

## Gate

```bash
cd backend
mvn -B -ntp -Dtest=MicrosoftRosterReconciliationServiceTest test
mvn -B -ntp verify

cd ../frontend
npm test
npm run typecheck
npm run build

cd ..
docker compose up -d --build
docker compose ps
```

## Fechamento do 15.2

Com este incremento, o fluxo de turmas e alunos do Teams possui descoberta,
matching, aplicação supervisionada e reconciliação.

Próxima macroetapa:

**15.3 — Activity Mapping**
