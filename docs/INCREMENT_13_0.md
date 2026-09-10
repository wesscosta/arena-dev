# Incremento 13.0 — Bootstrap da v0.5

**Data:** 10/09/2026  
**Linha:** `v0.5.0 — Live Quiz & Structured Responses`  
**Status:** concluído documentalmente.

## Objetivo

Abrir a nova linha sem introduzir runtime antes de fechar as fronteiras entre autoria, execução ao vivo, resposta e pontuação.

## Baseline congelada

```text
merge commit   ccfb7f937e7ac7db330cfa5e54c3e3816b69962f
tag            v0.4.0
CI             34428450704 — success
Flyway         V1–V14
```

## Decisões do bootstrap

```text
ActivityQuestion    = autoria
QuizRound           = execução ao vivo
ParticipantAnswer   = resposta enviada
ScoreEvent          = XP
LiveStage           = apresentação
SessionEvent        = timeline operacional
```

- não duplicar `ActivityQuestion`;
- não criar `QuizScore`;
- não registrar cada resposta como `SessionEvent`;
- Quiz só vira adapter completo do Live Stage quando existir runtime real;
- manifests continuam `0.4.0` até o gate da v0.5;
- nenhuma migration é criada no 13.0.

## Próximo incremento

**13.1 — Quiz Runtime**.

O próximo passo é implementar o domínio persistente mínimo de `QuizRound` e `ParticipantAnswer`, incluindo contratos, migration e testes de integração.
