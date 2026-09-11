# Incremento 13.3 — Resultados + Projetor

**Data:** 10/09/2026  
**Linha:** `v0.5.0 — Live Quiz & Structured Responses`  
**Estado:** implementação preparada; gates pendentes.

## Objetivo

Fechar o ciclo de condução do Quiz para o professor e para o Projetor, preservando a separação entre projeção administrativa e projeção pública.

## Professor

A Arena passa a oferecer um painel de Quiz com:

```text
PREPARAR → ABRIR → BLOQUEAR → REVELAR → ENCERRAR
```

O professor acompanha:

- presentes;
- respostas recebidas;
- pendentes;
- distribuição por alternativa;
- alternativa correta.

O painel reutiliza `ActivityQuestion`; não cria conteúdo autoral paralelo.

## Projetor

Quando `LiveStage.primary.type == QUIZ`, o Projetor passa a consumir `runtime.quiz`.

Durante `OPEN` e `LOCKED`:

- mostra a questão;
- mostra alternativas;
- mostra quantidade agregada de respostas;
- não mostra distribuição;
- não mostra resposta correta.

Após `REVEALED`:

- mostra distribuição por alternativa;
- mostra quantidade e percentual;
- destaca a resposta correta.

Reload/reconnect restaura o mesmo estado pelo `PublicRuntimeSnapshot`.

## Política de fechamento

`CLOSED` deixa de significar implicitamente "resultado revelado".

A regra pública passa a ser:

```text
publicResultsVisible = revealedAt != null
```

Consequências:

- fechar depois de revelar preserva o resultado público;
- fechar sem revelar mantém distribuição e correção protegidas;
- o professor continua vendo sua projeção administrativa.

## Persistência

Nenhuma migration nova.

Schema permanece em `V15`.

## Testes

- `QuizIT` cobre fechamento sem reveal;
- `quiz-projector.test.ts` cobre snapshot, realtime, proteção e correção;
- `quiz-panel.test.ts` cobre lifecycle e métricas do professor;
- frontend mantém gates de test/typecheck/build;
- backend mantém `mvn verify`.

## Próximo incremento

**13.4 — Avaliação + integração com `ScoreEvent`**.
