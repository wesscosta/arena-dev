# ADR-0040 — Release v0.5 exige evidência operacional no mesmo SHA

**Status:** Aceito  
**Data:** 11/09/2026

## Contexto

A v0.5 altera runtime, persistência, projeções públicas, XP e experiência móvel. Testes unitários isolados não são evidência suficiente para publicar uma tag.

## Decisão

A publicação de `v0.5.0` exige uma cadeia verificável:

```text
commit de release candidate
        ↓
PR / merge em main
        ↓
CI verde
        ↓
mesmo SHA
        ↓
backup real + checksum
        ↓
restore-check PostgreSQL 17 / Flyway V16
        ↓
release-gate final
        ↓
tag anotada
        ↓
GitHub Release
```

O gate final deve recusar:

- branch diferente de `main`;
- árvore suja;
- `main` fora de sincronia com `origin/main`;
- CI cujo head SHA difira do HEAD local;
- backup sem integridade/restauração válida;
- metadata divergente de `0.5.0`.

## E2E mínimo obrigatório

O E2E do Quiz deve provar, no navegador e backend reais:

- questão autorada usada no runtime;
- resposta no `/join`;
- restauração após reload/reconnect;
- correção não exposta antes de reveal;
- avaliação ao bloquear;
- exatamente um `ScoreEvent` QUIZ para a resposta correta;
- correção no Projetor após reveal;
- snapshot do Projetor preservando o reveal.

## Consequências

- tag não é mecanismo de teste;
- merge não equivale a publicação;
- documentação não pode marcar evidência que não foi executada;
- `v0.3.0` e `v0.4.0` permanecem imutáveis;
- o schema de release da v0.5 termina em V16.
