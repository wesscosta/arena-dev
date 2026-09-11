# ADR-0036 — Reveal do Quiz é explícito e fechamento não revela resultado

**Status:** Aceito  
**Data:** 10/09/2026

## Contexto

A primeira versão do runtime considerava `CLOSED` como resultado publicamente visível. Isso faria um encerramento administrativo revelar correção e distribuição mesmo quando o professor não tivesse executado `REVEAL`.

Essa semântica conflita com a política pedagógica do Quiz.

## Decisão

A visibilidade pública do resultado depende exclusivamente de a rodada ter sido revelada:

```text
publicResultsVisible = revealedAt != null
```

`status == CLOSED` não concede visibilidade por si só.

## Efeitos

- `OPEN → CLOSED`: resultado continua protegido;
- `LOCKED → CLOSED`: resultado continua protegido;
- `REVEALED → CLOSED`: resultado continua público porque `revealedAt` já existe;
- reload/reconnect preserva a decisão;
- Projetor nunca infere correção apenas pelo estado terminal.

## Professor versus público

A projeção administrativa continua podendo mostrar distribuição e resposta correta antes do reveal.

Projetor e participante recebem apenas a projeção pública.

## Consequências

A máquina de estados permanece a mesma. A mudança é de política de projeção, não de persistência.

Nenhuma migration é necessária.

Complementa ADR-0033, ADR-0034 e ADR-0035.
