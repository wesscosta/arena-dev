# Incremento 15.UI2 — Classroom Integration Workspace

## Objetivo

Trazer a integração para o contexto da própria turma sem criar uma nova aba
pesada nem transformar a Home em um console técnico.

## Decisão de UX

A navegação principal da turma continua:

```text
Home
Alunos
Atividades
Ranking
Histórico
```

Não foi criada uma aba permanente "Integrações".

Na Home aparece apenas um painel contextual compacto.

## Sem integração

```text
PLATAFORMA EDUCACIONAL

Sem integração externa

[Vincular plataforma]
```

## Com integração

```text
Microsoft Teams
Integração ativa nesta turma

13/15 alunos vinculados
5/8 atividades mapeadas

[Gerenciar integração]
```

## Fonte dos dados

O resumo usa apenas vínculos persistidos no Arena:

- `ExternalClassroomLink`;
- `ExternalStudentLink`;
- `ExternalActivityLink`;
- `IntegrationConnection`.

Abrir a Home da turma não consulta Microsoft Graph.

Isso evita chamadas remotas desnecessárias e mantém a integração como contexto,
não como dependência para abrir a turma.

## Endpoint

```text
GET /api/integrations/classrooms/{classroomId}/summary
```

## Próximo passo

Com a arquitetura de UX estabilizada, retomamos:

**15.4B — Persist External Submissions**
