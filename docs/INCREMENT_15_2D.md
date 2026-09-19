# Incremento 15.2D — Apply Student Matching

## Objetivo

Transformar o Student Matching Preview em ações supervisionadas pelo professor.

## Ações

- `APPLY_SUGGESTED`: permitido para `SAFE_MATCH` e `REVIEW_REQUIRED`;
- `CREATE_NEW_STUDENT`: permitido para `NEW_STUDENT`;
- `LINK_EXISTING_STUDENT`: contrato para resolução explícita por `localStudentId`.

Antes de qualquer escrita o backend recalcula o preview.

## Persistência

A aplicação pode criar ou reativar:

1. `Student`;
2. `Enrollment`;
3. `ExternalStudentLink`.

Quando disponível, `educationUser.externalId` é usado como `Student.registration`.

## Segurança

`CONFLICT` e `IGNORED_NON_STUDENT` permanecem bloqueados.

Reaplicar usuário já vinculado é idempotente e não duplica registros.

## Endpoint

```text
POST /api/integrations/microsoft/connections/{connectionId}/class-links/{classroomLinkId}/student-match-apply
```

## UI

- `SAFE_MATCH` → Aprovar vínculo;
- `REVIEW_REQUIRED` → Confirmar vínculo;
- `NEW_STUDENT` → Criar e vincular;
- `ALREADY_LINKED` → Concluído;
- conflitos/ambiguidades → Requer revisão.

Após aplicação a UI recarrega roster e preview.

## Gate

```bash
cd backend
mvn -B -ntp -Dtest=MicrosoftStudentMatchingApplyServiceTest test
mvn -B -ntp verify

cd ../frontend
npm test
npm run typecheck
npm run build

cd ..
docker compose up -d --build
docker compose ps
```

## Próxima etapa

15.2E — Roster Reconciliation & Conflict Resolution.
