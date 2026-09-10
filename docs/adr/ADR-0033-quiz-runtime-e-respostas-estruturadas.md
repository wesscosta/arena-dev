# ADR-0033 — Quiz Runtime e respostas estruturadas

**Status:** Aceito  
**Data:** 10/09/2026

## Contexto

A `v0.4.0` consolidou Live Stage, Live Flow, `/join`, Projetor, Poll, Word Cloud, Buzzer, reconnect e timeline operacional. O tipo `QUIZ` existe no vocabulário do palco, mas permaneceu sem runtime próprio.

A v0.5 precisa executar questões já autoradas em `ActivityQuestion` sem duplicar autoria e sem criar outra fonte de XP.

## Decisão

```text
ActivityQuestion    = conteúdo autoral
QuizRound           = execução em uma sessão
ParticipantAnswer   = resposta naquela rodada
ScoreEvent          = efeito de pontuação/XP
```

### Regras

1. `QuizRound` referencia `ActivityQuestion`; não copia a pergunta como nova autoria.
2. `ParticipantAnswer` pertence à rodada e ao participante.
3. A resposta é verdade do domínio Quiz; XP derivado é materializado em `ScoreEvent`.
4. Não criar `QuizScore`.
5. Resultados públicos são agregados e não expõem UUID administrativo.
6. Resposta correta fica protegida até o reveal permitir.
7. Live Flow pode iniciar ou revisitar a rodada sem runtime duplicado.
8. Reconnect restaura snapshot e não reexecuta abertura.
9. `SessionEvent` registra transições relevantes, não cada submissão.
10. O primeiro escopo suporta `MULTIPLE_CHOICE` e `TRUE_FALSE`.

## Estados planejados

```text
READY
OPEN
LOCKED
REVEALED
CLOSED
```

A semântica final de transições será fechada no 13.1 antes da migration.

## Alternativas rejeitadas

- `QuizQuestion` duplicando autoria;
- XP gravado diretamente na resposta;
- reutilizar Poll como Quiz;
- runtime apenas no frontend.

## Consequências

- fronteiras de domínio explícitas;
- reaproveitamento das questões existentes;
- XP continua auditável;
- projeções públicas/privadas permanecem separadas;
- nova persistência e testes de idempotência serão necessários no 13.1.

## Relação com ADRs anteriores

Complementa ADR-0007, ADR-0011, ADR-0017, ADR-0027, ADR-0029, ADR-0030 e ADR-0031.
