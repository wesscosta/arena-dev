# Incremento 13.6 — Mobile/PWA

**Data:** 11/09/2026  
**Linha:** `v0.5.0 — Live Quiz & Structured Responses`  
**Estado:** implementação preparada; gates pendentes.

## Objetivo

Tornar o `/join` instalável e robusto em dispositivos móveis sem transformar cache em fonte de verdade e sem prometer operação de aula offline.

## Installability

A aplicação passa a expor Web App Manifest, ícones 192 × 192 e 512 × 512, `display: standalone`, `start_url: /join`, Service Worker e prompt de instalação como progressive enhancement.

Em produção, Service Worker exige contexto seguro (`HTTPS`), salvo exceções locais aceitas pelos navegadores.

## Política de cache

Pode entrar em cache:

- shell do `/join`;
- fallback offline puramente informativo;
- manifest;
- ícones;
- `/_next/static/**`.

Nunca entra em cache:

```text
/api/**
```

WebSocket continua online-only.

Portanto:

```text
cache = disponibilidade da interface
backend = verdade do domínio
```

## Reconnect

O backoff automático continua existindo. Além dele, o `/join` recebe **Tentar agora**, que reinicia a conexão pela mesma credencial temporária e aguarda novo `RUNTIME_SNAPSHOT`.

Nenhum comando durável é reexecutado pelo reconnect.

## Mobile

- `100dvh`;
- safe areas;
- inputs com 16 px para evitar zoom involuntário;
- alvos de toque mínimos;
- layout empilhado em telas estreitas;
- Quiz com `touch-action: manipulation`;
- prompt de instalação respeitando safe area inferior.

## Persistência e versão

Nenhuma migration nova. Schema permanece em **V16**.

Os manifests de versão permanecem em `0.4.0`; o bump para `0.5.0` continua reservado ao 13.7.

## Próximo incremento

**13.7 — Hardening, E2E e release gate v0.5.0**.
