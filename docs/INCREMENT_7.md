# Incremento 7 — Atividades e mecânicas persistentes

## Objetivo

Remover o último estado operacional relevante do `localStorage` e fazer Spring Boot/PostgreSQL assumir também Atividades, Questões e o estado das mecânicas executadas dentro de uma `ClassSession`, preservando a interface V1.

## Persistência adicionada

A migration `V4__activities_and_session_mechanics.sql` cria:

- `activities`;
- `activity_questions`;
- `session_dynamics`;
- `group_history`.

`Activity` pertence sempre a uma `Classroom`. `ActivityQuestion` pertence sempre a uma `Activity`. A cópia entre turmas cria novos UUIDs e mantém apenas rastreabilidade da origem.

## Atividades e questões

A API passa a oferecer:

- `GET /api/activities?classroomId={uuid}`;
- `GET /api/activities/{id}`;
- `POST /api/activities`;
- `PUT /api/activities/{id}`;
- `POST /api/activities/{id}/copy`.

O contrato do frontend continua compatível com o Arena Dev Question Package `1.0`. IDs temporários gerados no navegador para questões novas são substituídos por UUIDs do backend ao salvar. Em edições posteriores, UUIDs existentes são preservados para manter rastreabilidade de ScoreEvents.

## Mecânicas da sessão

`session_dynamics` mantém o estado corrente de cada tipo de dinâmica por sessão:

- `QUICK_DRAW`;
- `GROUPS`;
- `BOSS_BATTLE`;
- `ARENA`.

O payload específico fica em `state_json`. A entidade continua associada à `ClassSession`; não existe uma segunda sessão no navegador.

### Sorteio inteligente

O backend passa a decidir oficialmente o aluno sorteado. A ponderação preserva a regra validada no frontend:

```text
weight = 1 / (count + 1)^1.35
```

Quando houver alternativa, o último aluno sorteado é retirado do pool imediato. O frontend mantém apenas a animação.

### Organização da turma

A formação de duplas/trios/grupos também passa para o backend. `group_history` registra combinações anteriores e o algoritmo tenta minimizar pares repetidos. `Individual` continua sendo uma organização válida, mas não cria histórico artificial de pareamentos.

### Boss Battle

Nome, HP máximo e HP atual ficam persistidos. Dano é processado no backend e o estado reaparece após reload.

### Activity → Arena

A atividade selecionada, questão atual e IDs das questões já apresentadas passam a ser estado persistido da dinâmica `ARENA`. Trocar para modo livre também é uma alteração persistente.

## ScoreEvent

A partir deste incremento, novas referências `activityId`/`questionId` enviadas em ScoreEvents são validadas contra Atividades e Questões reais do backend. Os campos textuais existentes na tabela de ScoreEvents foram preservados nesta etapa para evitar uma migração destrutiva de históricos de desenvolvimento anteriores.

## localStorage

Após o Incremento 7, o navegador guarda apenas a preferência `activeClassroomId`. Não é mais fonte de verdade para:

- turmas/alunos/matrículas;
- sessões/presença;
- XP/ScoreEvents;
- atividades/questões;
- sorteio;
- grupos;
- Boss Battle;
- fonte e sequência de questões da Arena.

Atividades e runtime locais experimentais de incrementos anteriores não são importados automaticamente, porque seus IDs não possuem correspondência segura com UUIDs e ScoreEvents persistidos.

## Backup

A exportação continua funcionando como snapshot da visão carregada. A restauração direta pelo navegador foi desativada: restaurar domínio persistente exige uma operação server-side própria e transacional, planejada separadamente.

## Critérios de validação

- [ ] atividade criada reaparece após `F5`;
- [ ] questões criadas/importadas reaparecem após `F5`;
- [ ] editar uma questão existente preserva seu UUID;
- [ ] cópia entre turmas cria IDs independentes;
- [ ] sorteio reaparece com contagem e último sorteado após `F5`;
- [ ] grupos reaparecem após `F5` e o histórico influencia a próxima formação;
- [ ] modo Individual não adiciona `group_history`;
- [ ] Boss reaparece com o HP atual após `F5`;
- [ ] atividade/fonte da Arena e sequência de questões reaparecem após `F5`;
- [ ] ScoreEvent com atividade/questão de outra turma é rejeitado;
- [ ] `localStorage` contém apenas preferência de contexto.
