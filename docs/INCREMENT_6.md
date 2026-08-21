# Incremento 6 — ScoreEvent e ranking auditável

## Objetivo

Migrar XP/pontuação do navegador para Spring Boot + PostgreSQL, mantendo o ranking atual como projeção de eventos e substituindo exclusões destrutivas por reversões auditáveis, conforme ADR-0007.

## Fonte de verdade

A partir deste incremento, `ScoreEvent` é durável no backend. O frontend não grava mais `scoreEvents` no `localStorage`.

```text
Classroom
   └── ScoreEvent ── Student
           │
           ├── ClassSession (opcional)
           ├── source
           ├── activityRef (opcional)
           ├── questionRef (opcional)
           └── reversalOf (opcional)
```

O ranking continua sendo calculado por:

```text
XP do aluno = SUM(score_events.points)
```

Não existe tabela de ranking ou contador duplicado.

## Banco de dados

Migration `V3__score_events.sql` cria `score_events` com:

- FK para turma e aluno;
- FK opcional para sessão;
- `points`, `category`, `description` e `source`;
- referências textuais opcionais para atividade/questão enquanto esse domínio ainda é local-first;
- `reversal_of` autorreferente;
- índice único parcial que impede duas reversões do mesmo lançamento;
- índices por turma/data, aluno/data, sessão e origem.

## API

```text
GET  /api/score-events?classroomId={uuid}
POST /api/score-events
POST /api/score-events/batch
POST /api/score-events/{id}/reverse
```

O endpoint em lote atende entrega de atividade para vários alunos em uma única transação.

## Regras

- pontuação zero não gera evento;
- aluno precisa pertencer ativamente à turma;
- quando há `sessionId`, a sessão precisa pertencer à turma e o aluno precisa ser participante;
- evento de reversão não pode ser revertido diretamente;
- um lançamento original só pode possuir uma reversão;
- correção preserva o original e cria novo evento com pontuação inversa.

Exemplo:

```text
+10 QUESTION   Resposta correta
-10 ADJUSTMENT Reversão: Resposta correta (reversalOf = evento anterior)
```

## Frontend

- bootstrap carrega ScoreEvents da API para todas as turmas;
- Arena cria pontuação via API;
- entregas de atividades usam criação em lote;
- ranking continua com a mesma experiência visual, mas deriva dos eventos persistidos;
- histórico troca “remover” por “reverter”;
- eventos revertidos permanecem visíveis e identificados;
- `localStorage` deixa de persistir ScoreEvents;
- importação de backup não sobrescreve XP do PostgreSQL;
- ambiente de demonstração cria XP pela API.

## Persistência após o incremento

### PostgreSQL

- Classroom
- Student
- Enrollment
- ClassSession
- SessionParticipant
- ScoreEvent

### Ainda local-first

- Activity e ActivityQuestion
- SessionRuntimeState (sorteio/Boss/fonte da Arena)
- GroupHistory

## Critérios de aceite

- [ ] XP lançado na Arena permanece após F5.
- [ ] XP de entrega de atividade permanece após F5.
- [ ] ranking permanece idêntico após F5.
- [ ] reversão cria evento inverso e não remove o original.
- [ ] segunda reversão do mesmo lançamento é rejeitada.
- [ ] total do ranking é reconstruível somente pelos ScoreEvents.
- [ ] backup local não sobrescreve pontuação persistida.
