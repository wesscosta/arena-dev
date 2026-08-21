# Incremento 5 — Sessões e presença via API

## Objetivo

Mover `ClassSession` e `SessionParticipant` para Spring Boot/PostgreSQL como fonte de verdade sem alterar a experiência central da Arena nem antecipar a migração de XP, atividades, sorteio, grupos ou Boss Battle.

## Escopo implementado

- iniciar sessão via `POST /api/sessions`;
- impedir mais de uma sessão `ACTIVE` por turma, com validação de serviço e índice único parcial no PostgreSQL;
- carregar sessões por turma a partir da API;
- carregar participantes da sessão a partir da API;
- persistir presença inicial no `SessionParticipant`;
- alterar presença durante uma sessão ativa via API;
- encerrar sessão via `POST /api/sessions/{id}/finish`;
- recuperar automaticamente uma sessão ativa após reload;
- manter a troca de turma respeitando a sessão ativa de cada turma;
- manter mecânicas ainda não migradas em um runtime local associado ao UUID real da sessão;
- impedir que importação de backup substitua sessões/presença persistidas no PostgreSQL.

## Fronteira de persistência após este incremento

### PostgreSQL — fonte de verdade

- `Classroom`;
- `Student`;
- `Enrollment`;
- `ClassSession`;
- `SessionParticipant`;
- presença.

### localStorage — temporário

- `ScoreEvent`/XP;
- `Activity` e questões;
- histórico de grupos;
- estado transitório das mecânicas da sessão: contagem de sorteios, último sorteado, Boss, atividade conectada à Arena e sequência local de questões.

O runtime local usa `sessionId` emitido pelo backend e não cria uma sessão paralela no navegador.

## Fluxo

```text
Professor seleciona turma
        ↓
Marca presença inicial
        ↓
POST /api/sessions
        ↓
ClassSession + SessionParticipant
        ↓
Arena usa o UUID real da sessão
        ↓
Professor altera presença
        ↓
PATCH /presence
        ↓
Reload
        ↓
GET sessões + participantes
        ↓
Sessão ativa é restaurada
```

## Compatibilidade das mecânicas

Sorteio, Boss, grupos e `Activity → Arena` continuam funcionando com o mesmo frontend. A diferença é que passam a referenciar uma sessão persistida. Os campos ainda locais ficam em `SessionRuntimeState`, evitando que `ClassSession` volte a ter uma segunda fonte de verdade.

## Regra de sessão ativa

Uma turma pode ter no máximo uma sessão `ACTIVE`. O backend rejeita uma segunda abertura até que a sessão atual seja encerrada.

Turmas diferentes podem possuir sessões ativas simultaneamente; ao trocar a turma no seletor global, o frontend recupera a sessão ativa daquele contexto.

## Backup

Backups locais deixam de restaurar `sessions` e `sessionParticipants`. Eles podem restaurar somente módulos ainda local-first e apenas quando suas referências apontarem para IDs existentes no backend atual.

## Critérios de aceite

- [ ] iniciar sessão cria registro no PostgreSQL;
- [ ] F5 mantém a sessão ativa;
- [ ] presença inicial é restaurada após F5;
- [ ] alterar presença durante a sessão persiste após F5;
- [ ] encerrar sessão permanece encerrada após F5;
- [ ] não é possível abrir duas sessões simultâneas para a mesma turma;
- [ ] uma segunda turma pode possuir sua própria sessão ativa;
- [ ] sorteio, grupos, Boss e Activity → Arena continuam funcionando;
- [ ] `localStorage` não contém cópia autoritativa de `ClassSession` ou `SessionParticipant`.

## Próximo incremento

`ScoreEvent` e ranking passam a usar o backend como fonte de verdade, com reversão auditável e filtros por origem.
