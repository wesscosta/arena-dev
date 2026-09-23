# Incremento 15.1C — Select & Link Microsoft Class

## Objetivo

Permitir que o professor associe explicitamente uma turma já existente no Arena Dev
a uma `educationClass` descoberta no Microsoft Graph.

Nenhuma turma local é criada automaticamente.

## Endpoint

```text
POST /api/integrations/microsoft/connections/{connectionId}/class-links
```

Payload:

```json
{
  "classroomId": "uuid-da-turma-arena",
  "microsoftClassId": "id-da-educationClass"
}
```

## Regras

Antes do vínculo:

1. a turma local deve existir;
2. a conexão Microsoft deve continuar válida/ativa;
3. a turma Microsoft deve aparecer na descoberta atual da conexão;
4. a combinação local/externa deve ser consistente.

## Idempotência

Repetir exatamente o mesmo vínculo retorna o vínculo existente.

## Conflitos

Retorna conflito quando:

- a turma local já aponta para outro `microsoftClassId`;
- o mesmo `microsoftClassId` já aponta para outra turma local.

Isso fecha uma dívida do Integration Core em que vínculos divergentes poderiam
ser silenciosamente tratados como idempotentes.

## Persistência

A etapa usa a tabela já criada em V26:

```text
external_classroom_links
```

Não há V27.

## Fora de escopo

Ainda não sincroniza:

- estudantes;
- matrículas;
- tarefas;
- submissions;
- notas;
- feedback.

## Gate

```bash
cd backend
mvn -B -ntp -Dtest=MicrosoftClassLinkServiceTest,ExternalClassroomLinkConflictTest test
mvn -B -ntp verify
```

Depois:

```bash
cd ..
docker compose up -d --build
docker compose ps
```

## Próxima etapa

**15.2 — Teams Classrooms & Students**

Com a turma Microsoft vinculada, a próxima etapa começa a leitura do roster
e o mapeamento de estudantes/matrículas.
