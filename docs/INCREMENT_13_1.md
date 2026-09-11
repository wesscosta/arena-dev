# Incremento 13.1 — Quiz Runtime

**Data:** 10/09/2026  
**Linha:** `v0.5.0 — Live Quiz & Structured Responses`  
**Estado:** concluído localmente; `mvn -B -ntp verify` informado como verde em 10/09/2026. CI permanece como gate da linha/release.

## Objetivo

Criar o runtime persistente mínimo do Quiz sem duplicar `ActivityQuestion` e sem introduzir uma fonte paralela de XP.

## Modelo

```text
ActivityQuestion
      │
      ↓ referência
QuizRound
      │
      └── ParticipantAnswer
```

`ScoreEvent` permanece fora deste incremento e continua sendo a única fonte de verdade do XP.

## Máquina de estados

```text
READY → OPEN → LOCKED → REVEALED → CLOSED
  └──────────────────────────────→ CLOSED
```

Regras:

- `READY`: questão preparada, ainda não exposta publicamente;
- `OPEN`: aceita respostas;
- `LOCKED`: respostas congeladas;
- `REVEALED`: distribuição e resposta correta podem ser projetadas;
- `CLOSED`: estado terminal;
- fechar é permitido a partir de qualquer estado não terminal.

## Respostas

No MVP:

```text
MULTIPLE_CHOICE
TRUE_FALSE
```

Uma linha de `ParticipantAnswer` existe por participante/rodada. Durante `OPEN`, a primeira submissão cria a resposta; repetir a mesma resposta é idempotente; selecionar outra atualiza a mesma linha. Depois de `LOCKED`, nenhuma alteração é aceita.

## Projeções

- Professor: questão, resposta correta, total e distribuição.
- Público em `READY`: questão protegida.
- Público em `OPEN/LOCKED`: questão e total, sem distribuição/correta.
- Público em `REVEALED/CLOSED`: distribuição e resposta correta.
- Participante: própria resposta e resposta correta apenas após reveal.

## Persistência — V15

```text
quiz_rounds
quiz_participant_answers
```

Há um único Quiz corrente por sessão (`READY/OPEN/LOCKED/REVEALED`). `question_id` usa `ON DELETE RESTRICT`, preservando a referência ao conteúdo autoral. Há uma resposta por participante/rodada.

## Transporte

Admin REST:

```text
GET  /api/sessions/{sessionId}/quiz
POST /api/sessions/{sessionId}/quiz
POST /api/sessions/{sessionId}/quiz/{roundId}/open
POST /api/sessions/{sessionId}/quiz/{roundId}/lock
POST /api/sessions/{sessionId}/quiz/{roundId}/reveal
POST /api/sessions/{sessionId}/quiz/{roundId}/close
```

O serviço publica `QUIZ_STATE` após commit. O transporte de submissão do `/join` fica para o **13.2**; neste incremento existe a operação de domínio `QuizService.answer(...)`.

## Fora deste incremento

- UI do professor e `/join`;
- renderização do Projetor;
- adapter Quiz no Live Flow/Live Stage;
- correção/XP;
- `SessionEvent` do Quiz;
- PWA.

## Gate

`QuizIT` cobre lifecycle, alteração antes do lock, proteção pública, reveal, verdadeiro/falso, tipo não suportado, exclusividade de rodada corrente e encerramento junto com a sessão.

A conclusão documental do 13.1 depende de `mvn -B -ntp verify` verde.
