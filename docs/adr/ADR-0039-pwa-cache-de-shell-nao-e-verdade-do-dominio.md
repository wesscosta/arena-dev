# ADR-0039 — Cache da PWA serve ao shell, nunca à verdade do domínio

**Status:** Aceito  
**Data:** 11/09/2026

## Contexto

O `/join` é usado principalmente em smartphones e precisa de instalação, retomada rápida e tolerância à perda transitória de rede. Entretanto, respostas, presença, Quiz, Live Stage e pontuação pertencem ao backend autoritativo.

## Decisão

A PWA usa cache limitado à interface e assets estáticos.

O Service Worker pode armazenar `/join`, fallback offline informativo, manifest, ícones e `/_next/static/**`.

O Service Worker não usa cache para `/api/**`. WebSocket permanece dependente de conexão ativa.

## Reconnect

Reconexão restaura o domínio somente por novo canal autenticado e `RUNTIME_SNAPSHOT`.

O shell visível durante perda de rede não promove o último estado exibido a fonte de verdade.

## Consequências

- melhor experiência móvel sem duplicar domínio;
- instalação não implica operação de aula offline;
- mutations nunca são enfileiradas silenciosamente;
- reconnect não repete comandos duráveis;
- nenhuma migration é necessária.

Complementa ADR-0030, ADR-0035 e ADR-0038.
