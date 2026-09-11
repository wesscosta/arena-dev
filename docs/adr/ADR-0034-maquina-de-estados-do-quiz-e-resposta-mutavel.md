# ADR-0034 — Máquina de estados do Quiz e resposta mutável antes do lock

**Status:** Aceito  
**Data:** 10/09/2026

## Contexto

O ADR-0033 separou autoria (`ActivityQuestion`), execução (`QuizRound`), resposta (`ParticipantAnswer`) e XP (`ScoreEvent`). Faltava fechar a semântica de execução antes da primeira migration da v0.5.

## Decisão

Adotar:

```text
READY → OPEN → LOCKED → REVEALED → CLOSED
```

`CLOSED` também pode ser alcançado diretamente a partir de qualquer estado não terminal para encerramento/cancelamento.

Enquanto `OPEN`, o participante pode alterar sua resposta; a mesma entidade `ParticipantAnswer` é atualizada. Depois de `LOCKED`, a resposta é imutável.

`QuizRound` referencia diretamente `ActivityQuestion`. A implementação usa FK `ON DELETE RESTRICT`, preservando a referência histórica e evitando apagar silenciosamente o conteúdo que originou a rodada.

A questão não é exposta publicamente em `READY`. Distribuição e resposta correta só aparecem em `REVEALED/CLOSED`; o total agregado de respostas pode aparecer em `OPEN/LOCKED`.

## Consequências

- reconnect e idempotência ganham estados inequívocos;
- o aluno pode corrigir escolha acidental antes do lock;
- lock define o corte para futura avaliação/XP;
- exclusão de questão já usada precisa ser tratada explicitamente;
- respostas individuais não entram em `SessionEvent`.

## Relação

Complementa ADR-0033, ADR-0027, ADR-0030 e ADR-0031.
