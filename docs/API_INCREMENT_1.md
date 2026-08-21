# API — Incremento 1

O frontend ainda não consome estes endpoints. Eles existem para validar a fundação persistente antes da migração da interface.

## Health

```http
GET /api/health
```

## Turmas

```http
GET  /api/classrooms
POST /api/classrooms
PUT  /api/classrooms/{id}
```

Exemplo:

```json
{
  "name": "Técnico em Desenvolvimento de Sistemas",
  "code": "TDS-2026"
}
```

`code` é opcional para manter compatibilidade com a interface atual.

## Alunos

```http
GET  /api/students
POST /api/students
PUT  /api/students/{id}
```

Exemplo:

```json
{
  "registration": "2026.19.422",
  "name": "Aluno Exemplo",
  "nickname": "Aluno"
}
```

`registration` é opcional neste incremento para permitir futura migração dos dados local-first já existentes sem perda.

## Matrículas em turma

```http
GET    /api/classrooms/{classroomId}/students
POST   /api/classrooms/{classroomId}/students/{studentId}
DELETE /api/classrooms/{classroomId}/students/{studentId}
```

O `DELETE` é lógico: a matrícula é inativada em vez de apagada fisicamente.

## Sessões

```http
POST /api/sessions
GET  /api/sessions?classroomId={classroomId}
GET  /api/sessions/{sessionId}
GET  /api/sessions/{sessionId}/participants
PATCH /api/sessions/{sessionId}/participants/{participantId}/presence
POST /api/sessions/{sessionId}/finish
```

Exemplo de criação:

```json
{
  "classroomId": "UUID_DA_TURMA",
  "title": "Aula · Estruturas de repetição",
  "presentStudentIds": ["UUID_1", "UUID_2"]
}
```

Os participantes da sessão são derivados das matrículas ativas da turma; `presentStudentIds` define quem começa como presente.
