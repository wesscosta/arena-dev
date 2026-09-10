# ADR-0032 — Hardening e release gate da v0.4.0

**Status:** Aceito  
**Data:** 09/09/2026

## Contexto

A v0.4 introduziu Timer, Projetor, Word Cloud, Live Flow, Live Stage, identidade contextual, device claim, Poll, reconnect público e SessionEvent. O risco principal ao final da linha deixou de ser falta de feature e passou a ser regressão entre múltiplos estados realtime, exposição pública e tooling de release ainda preso à v0.3.0.

## Decisão

Fechar a v0.4 com uma etapa exclusivamente de hardening e evidência.

1. Não adicionar novo domínio funcional em 12.6.
2. Bump dos manifests/tooling para `0.4.0` somente nesta etapa.
3. Rate limit de login local adequado ao monólito atual; edge rate limiting continua responsabilidade de infraestrutura quando houver múltiplas instâncias.
4. `X-Request-Id` + MDC como observabilidade mínima; não introduzir stack de tracing.
5. Separar liveness de readiness e fazer Compose depender de readiness.
6. E2E deve atravessar navegador, API, PostgreSQL e WebSocket reais para os fluxos críticos da v0.4.
7. `mvn verify`, Playwright, CI remoto, backup/restore e gate final são evidências independentes e obrigatórias antes da tag.
8. `v0.3.0` permanece imutável; a nova tag será `v0.4.0` somente após todos os gates.

## Consequências

### Positivas

- release candidate possui metadados coerentes;
- regressões de integração pública ficam cobertas por Chromium;
- brute force básico deixa de ser risco residual conhecido no endpoint de login;
- suporte operacional ganha request ID e health sem infraestrutura adicional;
- backup/restore passa a validar o schema real V1–V14.

### Limites

- rate limit em memória não coordena múltiplas instâncias;
- readiness verifica PostgreSQL, não serviços externos inexistentes no MVP;
- request ID não substitui tracing distribuído;
- E2E não tenta cobrir todas as combinações possíveis de dinâmica;
- a implementação local não equivale a CI/tag publicada.
