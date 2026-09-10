# Incremento 12.4B — Editor do Roteiro ao Vivo

## Objetivo

Dar ao professor uma interface de autoria para `ActivityStep`, mantendo:

```text
Activity + ActivityStep[] = preparação
ClassSession              = execução futura
```

Nenhum bloco é executado neste incremento.

## Editor

O modal de atividade passa a possuir:

```text
Geral e XP | Questões | Roteiro
```

Ao entrar em `Roteiro`, a atividade é persistida primeiro para garantir UUIDs
reais nas questões referenciadas por steps `QUESTION`.

## Blocos

- `SLIDE`: título, instrução e conteúdo;
- `QUESTION`: referência a questão da própria atividade;
- `WORD_CLOUD`: pergunta, 1–5 palavras e live/reveal;
- `POLL`: pergunta, 2–8 opções e resultado oculto/live.

`POLL` não possui resposta correta e não distribui XP. Se houver resposta
correta ou pontuação, o conteúdo deve usar `QUESTION`.

## Persistência

```http
GET /api/activities/{activityId}/steps
PUT /api/activities/{activityId}/steps
```

O backend continua sendo a fonte de verdade.

## Fora deste incremento

Ainda não entram:

- step atual da sessão;
- Anterior / Próximo;
- `LIVE_STEP_STATE`;
- criação automática de `WordCloudRound`;
- `PollRound` / `PollVote`;
- `/join`;
- Projetor.

## Gate

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

Depois:

```bash
cd ..
docker compose up -d --build
docker compose ps
```

Teste manual:

1. abrir atividade;
2. cadastrar pelo menos uma questão;
3. abrir `Roteiro`;
4. adicionar Slide, Questão, Nuvem e Votação;
5. reordenar;
6. salvar;
7. fechar e reabrir;
8. confirmar restauração;
9. copiar para outra turma;
10. confirmar o roteiro na cópia.
