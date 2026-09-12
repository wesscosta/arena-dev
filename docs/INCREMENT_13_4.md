# Incremento 13.4 — Avaliação automática + integração com ScoreEvent

**Data:** 11/09/2026  
**Linha:** `v0.5.0 — Live Quiz & Structured Responses`  
**Estado:** implementação preparada; gates pendentes.

## Objetivo

Avaliar automaticamente respostas objetivas quando a rodada é bloqueada e transformar somente acertos elegíveis em `ScoreEvent`, sem criar uma segunda fonte de verdade para XP.

## Momento da avaliação

A avaliação acontece na transição:

```text
OPEN → LOCKED
```

Esse é o primeiro ponto em que a resposta já não pode ser alterada. `REVEAL` continua sendo uma decisão pedagógica de exposição pública e não é pré-requisito para a avaliação.

## Regra de pontuação

Para cada `ParticipantAnswer` ainda não avaliada:

```text
resposta == gabarito
    ├── não → evaluated=true, correct=false, sem XP
    └── sim
         ├── question.points <= 0 → correct=true, sem XP
         └── question.points > 0 → ScoreEvent
```

O evento de XP usa `category = QUESTION`, `source = QUIZ`, referências da atividade/questão, sessão e estudante já existentes.

## Idempotência

A avaliação é protegida por três camadas:

1. `QuizRound` é carregada com `PESSIMISTIC_WRITE`;
2. `ParticipantAnswer.evaluatedAt` impede reavaliação;
3. `score_event_id` liga a avaliação ao lançamento efetivamente criado.

Como `QuizService.lock()` e `ScoreEventService.create()` participam da mesma transação, falhas revertem avaliação e XP juntas. Repetir `lock` não cria pontuação duplicada.

## Reversão

A correção e o ledger são conceitos distintos:

```text
ParticipantAnswer.correct = verdade da avaliação
ScoreEvent               = verdade do XP
```

Reverter XP continua usando `ScoreEventService.reverse()`. Uma reversão não transforma uma resposta correta em incorreta e não faz o Quiz recriar XP em retries posteriores.

## Persistência — V16

`quiz_participant_answers` recebe `evaluated_at`, `is_correct` e `score_event_id → score_events(id)`. Não é criada tabela `QuizScore`.

## SessionEvent

A timeline registra somente `QUIZ_PREPARED`, `QUIZ_OPENED`, `QUIZ_LOCKED`, `QUIZ_REVEALED` e `QUIZ_CLOSED`. Submissões individuais não geram `SessionEvent`.

## Testes

`QuizScoringIT` cobre acerto/erro, múltipla escolha, verdadeiro/falso, idempotência do lock, reversão via `ScoreEvent` e timeline sem eventos por resposta.

## Próximo incremento

**13.5 — Feedback pedagógico**.
