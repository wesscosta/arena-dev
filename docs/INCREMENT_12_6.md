# 12.6 — Hardening, E2E e gate da v0.4.0

**Data:** 09/09/2026  
**Status:** implementado localmente; `mvn verify`, Docker/Playwright real, CI remoto e gate final permanecem obrigatórios antes da tag.

## Objetivo

Fechar a linha `v0.4 — Live Classroom` como release candidate reproduzível, sem adicionar novo domínio funcional.

O 12.6 concentra quatro frentes:

1. hardening de autenticação e respostas HTTP;
2. observabilidade operacional mínima;
3. E2E dos fluxos críticos introduzidos na v0.4;
4. alinhamento do tooling e dos metadados para `0.4.0`.

## Hardening de autenticação

O login do professor passa a possuir rate limit local, por combinação de endereço remoto + usuário normalizado.

Defaults:

```text
5 falhas
janela de 60 s
bloqueio de 300 s
```

Variáveis opcionais:

```text
APP_LOGIN_RATE_LIMIT_MAX_FAILURES
APP_LOGIN_RATE_LIMIT_WINDOW_SECONDS
APP_LOGIN_RATE_LIMIT_BLOCK_SECONDS
```

Regras:

- somente falhas contam;
- login bem-sucedido limpa o bucket;
- bloqueio retorna HTTP `429` + `Retry-After`;
- credenciais inválidas continuam retornando a mesma mensagem genérica;
- o mapa em memória possui limpeza oportunística para evitar crescimento indefinido;
- o mecanismo é adequado ao monólito single-instance atual e não pretende substituir rate limit de edge/proxy em uma futura implantação distribuída.

## Headers e correlação

Todas as requisições recebem `X-Request-Id`.

- um identificador seguro fornecido pelo cliente pode ser preservado;
- valores inválidos são substituídos por UUID gerado no backend;
- o ID entra no MDC e no padrão de log;
- respostas Spring Security mantêm `X-Frame-Options: DENY` e passam a declarar `Referrer-Policy: no-referrer` explicitamente.

Isso permite correlacionar um erro reportado pelo navegador com a linha correspondente no log sem introduzir tracing distribuído.

## Liveness e readiness

O contrato de health foi separado:

```text
GET /api/health/live   → processo da aplicação está vivo
GET /api/health/ready  → aplicação + PostgreSQL estão prontos
GET /api/health        → alias compatível de readiness
```

O healthcheck do Compose usa `/api/health/ready`.

## E2E v0.4

`frontend/e2e/critical-flows.spec.ts` passa a possuir três cenários reais em Chromium:

### Professor + reentrada do participante

- login real do professor;
- abertura do workspace da turma pela navegação contextual atual;
- entrada na Arena;
- `/join` por matrícula;
- WebSocket autenticado;
- reload e recuperação do participante.

### Live Flow completo

- atividade e `ActivityStep` preparados por API real;
- `SLIDE` no Projetor;
- `QUESTION` no Projetor e `/join`;
- `WORD_CLOUD` com submissão pelo navegador e reveal;
- `POLL` com voto pelo navegador e reveal;
- reload do Projetor preservando o Poll pelo snapshot REST/realtime;
- verificação da `SessionEvent` timeline gerada pelo fluxo.

### Buzzer + Boss

- abertura do Buzzer;
- press real pelo `/join`;
- posição privada do participante e nome público no Projetor;
- Boss sincronizado em participante + Projetor;
- dano final e estado derrotado propagado em realtime.

## Release metadata

A versão passa oficialmente de `0.3.0` para `0.4.0` em:

```text
backend/pom.xml
frontend/package.json
frontend/package-lock.json
scripts/release/check-metadata.sh
scripts/release/release-gate.sh
```

A tag `v0.3.0` continua congelada como baseline histórica.

## Backup/restore

`verify-backup.sh` agora valida:

- Flyway V1–V14;
- 14 migrations bem-sucedidas;
- 13 tabelas centrais representativas da v0.4, incluindo `activity_steps`, `session_events`, Timer, Buzzer, Word Cloud, Poll e device claims.

O gate local também verifica liveness/readiness depois que o Compose sobe.

## CI

O workflow continua dividido em:

```text
backend  → Java 21 + mvn verify
frontend → npm ci + audit + tests + typecheck + build
e2e      → Compose + Chromium + evidências de falha
```

O job E2E exige também licença e metadados `0.4.0` coerentes.

## Gates validados neste ambiente

Frontend:

```text
85/85 testes unitários/contratos OK
TypeScript incluindo E2E OK
Playwright discovery: 3 cenários OK
Next.js build de produção compilado com sucesso
```

Backend:

```text
compilação Java 21 de todos os fontes main OK
scripts/release/*.sh: bash -n OK
check-metadata.sh --require-license OK
```

## Gates que ainda exigem o ambiente normal/CI

```bash
cd backend
mvn -B -ntp verify

cd ../frontend
npm ci
npm audit --omit=dev --audit-level=high
npm test
npm run typecheck
npm run build

cd ..
scripts/release/release-gate.sh local
```

Antes da tag:

```bash
BACKUP_FILE="$(scripts/release/backup-postgres.sh)"
scripts/release/verify-backup.sh "$BACKUP_FILE"

scripts/release/release-gate.sh final \
  --ci-run-url https://github.com/wesscosta/arena-dev/actions/runs/ID \
  --backup "$BACKUP_FILE"
```

## Definition of Done da v0.4.0

### Código concluído

- [x] 12.1–12.5 implementados;
- [x] rate limit de login;
- [x] request ID e health live/ready;
- [x] três E2E críticos versionados;
- [x] metadata `0.4.0` alinhada;
- [x] restore-check atualizado para V14;
- [x] release gate atualizado.

### Evidência externa obrigatória

- [ ] `mvn verify` verde no estado final;
- [ ] Compose + três cenários Playwright verdes;
- [ ] CI GitHub Actions verde no mesmo SHA;
- [ ] backup real criado e restore-check verde;
- [ ] rollback/restore ensaiado no ambiente-alvo;
- [ ] `release-gate.sh final` verde;
- [ ] commit final integrado em `main`;
- [ ] tag anotada `v0.4.0`;
- [ ] GitHub Release `v0.4.0` publicada.

Nenhum desses itens externos deve ser marcado retroativamente sem a evidência correspondente.
