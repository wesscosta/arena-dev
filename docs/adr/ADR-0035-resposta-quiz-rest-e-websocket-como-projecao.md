# ADR-0035 — Resposta de Quiz via REST e WebSocket como projeção

**Status:** Aceito  
**Data:** 10/09/2026

## Contexto

O Quiz precisa receber respostas estruturadas do `/join`. O Arena Dev já usa WebSocket para sincronização imediata, mas sua arquitetura reserva REST para comandos que alteram estado durável.

## Decisão

A submissão de `ParticipantAnswer` usa um endpoint público sob `/api/join/**`, autenticado pelo token temporário do participante.

O WebSocket não é a fonte de persistência da resposta. Ele continua responsável por:

- `QUIZ_STATE`;
- snapshots de reconnect;
- atualização imediata das audiências.

O token é enviado no body do POST, nunca em query string.

## Motivos

- resposta é estado durável;
- REST fornece semântica de erro/retry mais simples;
- a mesma API funciona mesmo se o WebSocket estiver em reconexão;
- evita acoplar persistência à disponibilidade do canal realtime;
- mantém o backend autoritativo.

## Segurança

O código público resolve a sessão e o token precisa validar para a mesma sessão. O cliente não escolhe `participantId`.

A resposta correta continua protegida pela política de reveal do `QuizRound`.

## Consequências

- o `/join` atualiza imediatamente seu estado privado com a resposta REST;
- as demais audiências recebem `QUIZ_STATE`;
- reconnect restaura `quizParticipant` pelo snapshot;
- o futuro Projetor depende apenas da projeção pública.

Complementa ADR-0030, ADR-0033 e ADR-0034.
