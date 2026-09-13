# ADR-0037 — Avaliação no lock e ScoreEvent como ledger exclusivo de XP

**Status:** Aceito  
**Data:** 11/09/2026

## Contexto

`ParticipantAnswer` representa a resposta efetiva e `ScoreEvent` já é a fonte autoritativa de XP. O Quiz precisa corrigir questões objetivas sem introduzir `QuizScore`, duplicar pontuação ou atrelar avaliação ao reveal.

## Decisão

A avaliação automática ocorre quando `QuizRound` transita de `OPEN` para `LOCKED`.

Nesse momento cada resposta ainda não avaliada é comparada semanticamente ao `answer_json` da `ActivityQuestion`. Acertos com pontuação positiva geram `ScoreEvent`; erros não geram XP. `ParticipantAnswer` armazena somente metadados de avaliação e referência ao evento criado.

O `ScoreEvent` usa `source = QUIZ` e `category = QUESTION`.

## Idempotência

A rodada é bloqueada com lock pessimista e a resposta possui `evaluated_at`. A criação do `ScoreEvent` e a marcação da resposta acontecem na mesma transação. Repetir `lock` ignora respostas já avaliadas.

`score_event_id` oferece rastreabilidade entre correção e ledger, mas não transforma `ParticipantAnswer` em fonte de XP.

## Reversão

Reversões continuam sendo novos eventos no ledger de `ScoreEvent`. A resposta permanece correta/incorreta conforme a avaliação original. Um lançamento revertido não é recriado por retry da rodada.

## SessionEvent

Somente transições da rodada entram na timeline operacional. Respostas individuais não entram em `SessionEvent`, evitando ruído e exposição desnecessária.

## Consequências

- XP do Quiz participa automaticamente do ranking existente;
- auditoria e reversão reutilizam o domínio de pontuação;
- não existe `QuizScore`;
- avaliação independe de reveal;
- futuras políticas de bônus devem continuar produzindo `ScoreEvent`, nunca uma segunda contabilidade.

Complementa ADR-0007, ADR-0033, ADR-0034, ADR-0035 e ADR-0036.
