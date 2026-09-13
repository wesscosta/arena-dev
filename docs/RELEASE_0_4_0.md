# Release `v0.4.0` — Live Classroom

**Preparação:** 09/09/2026  
**Publicação:** 10/09/2026  
**Estado:** **publicada e congelada**.

## Escopo

A `v0.4.0` consolida a experiência de aula ao vivo sobre a baseline pública `v0.3.0`.

Principais entregas:

- Timer sincronizado e autoritativo;
- Projetor público;
- Word Cloud;
- autoria e runtime de `ActivityStep`;
- navegação contextual, Design System e acessibilidade;
- Live Stage por audiência;
- `preferredName` por matrícula e device claim opaco;
- Poll/Votação;
- orquestração Live Flow ↔ Live Stage;
- reconnect público com `RUNTIME_SNAPSHOT`;
- `SessionEvent` / linha do tempo operacional;
- hardening de login, `X-Request-Id`, liveness/readiness;
- Chromium E2E dos três fluxos críticos;
- refinamento final do header contextual e CTA da Arena.

## Schema e versões

```text
Flyway                    V1 ... V14
backend/pom.xml           0.4.0
frontend/package.json     0.4.0
frontend/package-lock     0.4.0
release tooling           0.4.0
```

O fechamento da `v0.4.0` não adicionou migration após `V14`.

## Evidência verificável da publicação

```text
PR final:        #9
Head final PR:   23526d9fdd37e72311272a5c4c29876552e98ccc
Merge em main:   ccfb7f937e7ac7db330cfa5e54c3e3816b69962f
CI final:        34428450704
Tag:             v0.4.0
GitHub Release:  https://github.com/wesscosta/arena-dev/releases/tag/v0.4.0
```

No CI final do PR:

- [x] `mvn -B -ntp verify`;
- [x] `npm ci`;
- [x] audit de dependências de produção;
- [x] testes frontend;
- [x] TypeScript;
- [x] build de produção Next.js;
- [x] validação do Compose;
- [x] build das imagens backend/frontend;
- [x] stack Compose saudável;
- [x] backend/frontend executando como usuário não-root `arena`;
- [x] três cenários Playwright Chromium críticos.

Antes do push final, os três cenários E2E também foram executados localmente com sucesso.

## Evidência operacional não registrada no repositório

O histórico versionado disponível não contém evidência suficiente para marcar retroativamente como executados:

- backup real com SHA-256;
- restore-check PostgreSQL 17 V1–V14;
- ensaio explícito de rollback/restore;
- `scripts/release/release-gate.sh final`.

Isso não altera o fato de que a tag e a GitHub Release foram publicadas, mas preserva a regra do projeto de não inventar evidência histórica.

## Imutabilidade

A tag `v0.4.0` representa a baseline pública da linha Live Classroom e **não deve ser movida ou recriada**.

Qualquer evolução funcional ocorre a partir da linha `v0.5`.
