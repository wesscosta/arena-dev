# Release candidate `v0.4.0` — Live Classroom

**Data de preparação:** 09/09/2026  
**Estado:** candidate preparada; **não publicada**.

## Escopo

A `v0.4.0` consolida a experiência de aula ao vivo sobre a baseline pública `v0.3.0`.

Principais entregas:

- Timer sincronizado e autoritativo;
- Projetor público;
- Word Cloud;
- autoria e runtime de `ActivityStep`;
- navegação contextual e Design System/acessibilidade;
- Live Stage por audiência;
- `preferredName` por matrícula e device claim opaco;
- Poll/Votação;
- orquestração Live Flow ↔ Live Stage;
- reconnect público com `RUNTIME_SNAPSHOT`;
- SessionEvent / linha do tempo operacional;
- hardening de login, request ID, liveness/readiness e E2E ampliado.

## Schema

Flyway esperado:

```text
V1 ... V14
```

Não existe migration nova em 12.6.

## Versões

```text
backend/pom.xml          0.4.0
frontend/package.json    0.4.0
frontend/package-lock    0.4.0
release tooling          0.4.0
```

## Gate obrigatório

A release só pode ser publicada quando todos os itens abaixo estiverem comprovados no **mesmo SHA**:

- [ ] `mvn -B -ntp verify` verde;
- [ ] `npm ci` + audit + tests + typecheck + build verdes;
- [ ] Compose saudável;
- [ ] três cenários Playwright críticos verdes;
- [ ] containers backend/frontend executando como usuário não-root `arena`;
- [ ] health live/ready verdes;
- [ ] GitHub Actions verde;
- [ ] backup real com SHA-256;
- [ ] restore-check PostgreSQL 17 com V1–V14 verde;
- [ ] rollback/restore ensaiado;
- [ ] `scripts/release/release-gate.sh final` verde;
- [ ] `main` limpa e sincronizada.

## Publicação

Somente depois do gate final:

```bash
git tag -a v0.4.0 -m "Arena Dev Community v0.4.0"
git push origin v0.4.0
```

A GitHub Release deve ser criada manualmente a partir dessa tag. A tag `v0.3.0` permanece congelada e nunca deve ser movida.

## Evidência

Registrar aqui, no momento da publicação:

```text
Commit final:
CI run:
Backup:
Restore-check:
Rollback simulado:
Release gate final:
GitHub Release:
```

Não preencher campos sem evidência real.
