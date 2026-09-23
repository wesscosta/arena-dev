# Incremento 15.2B — Student Matching Preview

## Objetivo

Comparar o roster Microsoft com estudantes e matrículas existentes no Arena Dev
antes de qualquer alteração local.

## Endpoint

```text
GET /api/integrations/microsoft/connections/{connectionId}/class-links/{classroomLinkId}/student-match-preview
```

## Classificações

```text
ALREADY_LINKED
SAFE_MATCH
NEW_STUDENT
REVIEW_REQUIRED
AMBIGUOUS
CONFLICT
IGNORED_NON_STUDENT
```

## Regras de segurança

### ALREADY_LINKED

O usuário Microsoft já possui `ExternalStudentLink` para a turma.

### SAFE_MATCH

O `externalId` educacional Microsoft coincide exatamente, ignorando caixa, com
a matrícula (`Student.registration`) local.

Nome não produz match seguro.

### REVIEW_REQUIRED

Existe exatamente um aluno local com o mesmo nome normalizado, mas não há
identificador institucional suficiente para vincular automaticamente.

### AMBIGUOUS

Mais de um aluno local possui o mesmo nome normalizado.

### NEW_STUDENT

Nenhum candidato local foi encontrado.

### CONFLICT

Uma matrícula local já está associada a outro usuário Microsoft.

### IGNORED_NON_STUDENT

O membro Microsoft não possui `primaryRole=student`.

## Efeito

A operação é somente leitura.

Ela não:

- cria Student;
- cria Enrollment;
- cria ExternalStudentLink;
- atualiza nomes;
- desativa matrícula;
- altera o Microsoft Teams.

## Gate

```bash
cd backend
mvn -B -ntp -Dtest=MicrosoftStudentMatchingPreviewServiceTest,MicrosoftStudentMatchingControllerTest test
mvn -B -ntp verify
```

Depois:

```bash
cd ..
docker compose up -d --build
docker compose ps
```

## UX

Até este incremento, a integração ainda é backend-first. A interface visual
será antecipada antes do restante da sincronização como uma Integration Console
MVP, em vez de esperar até o antigo marco 15.7.

## Próximo incremento

**15.2C — Integration Console MVP**

Tela administrativa mínima para:

- verificar readiness Microsoft;
- criar conexão;
- descobrir turmas;
- escolher vínculo Arena ↔ Teams;
- consultar roster;
- visualizar o Student Matching Preview.
