# Incremento 11.4 — E2E, CI e release hardening

**Status:** implementação concluída até a fatia 11.4D; gates locais validados até 11.4C. A release permanece bloqueada até licença, backup/restore real, rollback simulado e CI remoto verde no commit final.

## Objetivo

Converter os gates locais do Incremento 11.3 em proteção contínua, validar os fluxos críticos em navegador real e estabelecer critérios reproduzíveis para uma futura release estável.

## Fatia 11.4A — Integração contínua

### Implementado

- workflow único em `.github/workflows/ci.yml` para pushes e pull requests direcionados à `main`;
- permissão mínima de leitura do conteúdo do repositório;
- cancelamento automático de execução obsoleta da mesma referência;
- timeout explícito por job;
- backend em Java 21 com cache Maven e gate `mvn verify`;
- frontend em Node.js 22 com `npm ci`, testes, TypeScript e build de produção;
- validação do modelo Compose;
- build das imagens de backend e frontend após os gates de código;
- nenhum secret é necessário para o pipeline de validação.

### Critérios de aceite

- [x] workflow versionado e limitado à `main`;
- [x] gates backend e frontend reproduzem os comandos validados no 11.3;
- [x] dependências frontend são instaladas exclusivamente pelo lockfile;
- [x] configuração Compose e Dockerfiles participam do gate;
- [x] permissões, concorrência e timeouts estão explícitos;
- [ ] primeira execução concluída com sucesso no GitHub Actions e no commit final da release;
- [ ] evidência da execução registrada neste documento.

### Validação local segura

```bash
cd backend
mvn verify

cd ../frontend
npm ci
npm test
npm run typecheck
npm run build

cd ..
docker compose config --quiet
docker compose build backend frontend
```

## Fatia 11.4B — E2E com Playwright

### Implementado

- Playwright configurado com Chromium, execução serial e evidências de falha;
- dados isolados criados pela API autenticada a cada execução;
- login real do professor pelo navegador;
- seleção da turma preparada e confirmação da sessão ativa;
- entrada na Arena e confirmação da sessão corrente;
- join do participante por matrícula;
- autenticação realtime e confirmação de conexão;
- reload do navegador e reconexão pelo token persistido;
- execução integrada ao job Compose do GitHub Actions;
- relatório HTML, trace, screenshots e vídeos de falha preservados por sete dias;
- logs dos serviços exibidos quando o cenário falha;
- teardown do Compose executado mesmo após falha.

### Critérios de aceite

- [x] cenário crítico versionado sem depender de dados preexistentes;
- [x] professor e participante usam contextos de navegador separados;
- [x] login, turma, Arena, join e reconexão participam do mesmo fluxo ponta a ponta;
- [x] credenciais E2E são explícitas e não dependem de secrets do repositório;
- [x] artefatos e logs de falha estão configurados;
- [x] cenário executado com sucesso em Chromium, backend e PostgreSQL reais;
- [x] evidência da execução local registrada em 31/08/2026.

### Validação local

```bash
cd arena-dev
export APP_TEACHER_USERNAME=professor
export APP_TEACHER_PASSWORD=e2e-safe-password
export E2E_TEACHER_USERNAME=professor
export E2E_TEACHER_PASSWORD=e2e-safe-password

docker compose up --detach --build --wait

cd frontend
npm ci
npx playwright install chromium
npm run test:e2e

cd ..
docker compose down --volumes --remove-orphans
```

### 11.4C — Hardening de configuração e dependências

#### Implementado

- proteção CSRF por token para login e mutações autenticadas do professor;
- teste de integração que rejeita POST administrativo sem token CSRF;
- cookies de sessão `HttpOnly`, `Secure` e `SameSite=Strict` no perfil `prod`;
- perfil Spring de produção sem fallback para banco, credenciais, origem ou professor;
- overlay `compose.prod.yaml` que exige secrets, não publica PostgreSQL e liga serviços somente ao loopback;
- URL pública da API injetada no build standalone do Next.js;
- runtimes frontend standalone e backend/frontend não-root;
- auditoria npm, validação do Compose de produção e inspeção das imagens incorporadas ao CI;
- Dependabot semanal para npm, Maven, GitHub Actions e Dockerfiles.

#### Critérios de aceite

- [x] mutações administrativas exigem token CSRF;
- [x] rotas públicas do participante permanecem independentes da sessão do professor;
- [x] configuração de produção falha quando secrets e origens não são fornecidos;
- [x] PostgreSQL não é publicado pelo overlay de produção;
- [x] cookies seguros são obrigatórios no perfil `prod`;
- [x] imagens finais declaram usuário não-root e frontend usa saída standalone;
- [x] política automatizada de atualização está versionada;
- [x] testes, TypeScript, build e auditoria npm passam localmente;
- [x] `mvn verify` passa em Java 21 com Docker após a mudança CSRF: 14 testes, zero falhas;
- [x] Compose de produção e imagens endurecidas validados no Docker; serviços saudáveis e runtimes não-root;
- [ ] CI remoto conclui verde.

#### Execução de produção

O overlay não fornece TLS nem proxy reverso. Ele liga frontend e backend apenas em `127.0.0.1`; um proxy HTTPS externo deve publicar ambos. As URLs informadas no build precisam coincidir com as URLs desse proxy.

```bash
export POSTGRES_PASSWORD='senha-longa-e-unica'
export APP_FRONTEND_URL='https://arena.exemplo.com'
export APP_ALLOWED_ORIGIN_PATTERNS='https://arena.exemplo.com'
export APP_TEACHER_USERNAME='professor'
export APP_TEACHER_PASSWORD='senha-longa-e-unica-do-professor'
export NEXT_PUBLIC_API_URL='https://api.arena.exemplo.com'

docker compose -f compose.yaml -f compose.prod.yaml config --quiet
docker compose -f compose.yaml -f compose.prod.yaml up --detach --build --wait
```

## Fatia 11.4D — Release readiness

### Implementado

- versões do Maven, npm e lockfile alinhadas em `0.3.0`;
- validação automatizada dos metadados e de arquivos proibidos no artefato;
- gate local que repete backend, frontend, auditoria, Compose, imagens, usuários não-root e E2E;
- modo final que exige `main` limpa/sincronizada, licença, CI verde no mesmo SHA e backup restaurável;
- backup PostgreSQL em formato custom com checksum SHA-256;
- restauração do dump em PostgreSQL 17 temporário para validar Flyway `V1–V6` e tabelas centrais;
- restauração destrutiva protegida por confirmação, verificação prévia e backup de segurança;
- procedimento de rollback que separa aplicação de restauração de dados;
- decisão de usar `v0.3.0` e adiar `v1.0.0`;
- tag e GitHub Release mantidas como ações manuais após todos os gates.

Referências:

- [`RELEASE_0_3_0.md`](RELEASE_0_3_0.md);
- [`ADR-0025`](adr/ADR-0025-release-readiness-e-versionamento.md);
- `scripts/release/`.

### Critérios de aceite

- [x] manifests alinhados em `0.3.0`;
- [x] checklist operacional e evidências consolidados;
- [x] scripts de backup, verificação e restauração versionados;
- [x] rollback e limites do ambiente-alvo documentados;
- [x] gate final bloqueia tag baseada em árvore suja, CI de outro SHA ou backup inválido;
- [ ] licença definida e arquivo `LICENSE` presente;
- [ ] `main` limpa e sincronizada no commit final;
- [ ] execução remota do CI verde no mesmo commit;
- [ ] backup real criado e validado pelo restore-check;
- [ ] rollback simulado no ambiente-alvo;
- [ ] gate final concluído;
- [ ] tag anotada `v0.3.0` e GitHub Release publicadas.

### Comandos

```bash
scripts/release/check-metadata.sh
scripts/release/release-gate.sh local

BACKUP_FILE="$(scripts/release/backup-postgres.sh)"
scripts/release/verify-backup.sh "$BACKUP_FILE"

scripts/release/release-gate.sh final \
  --ci-run-url https://github.com/wesscosta/arena-dev/actions/runs/ID_DA_EXECUCAO \
  --backup "$BACKUP_FILE"
```

## Limites

- o workflow permanece **Implementado** até que uma URL/ID de execução verde no commit final seja registrada;
- Playwright foi validado localmente; o CI remoto ainda precisa registrar a execução verde;
- os defaults fracos permanecem somente no perfil de desenvolvimento; `prod` não os aceita;
- o overlay de produção pressupõe proxy TLS externo e não constitui sozinho uma plataforma completa de deploy;
- não existe rate limit específico para tentativas de login;
- a licença do projeto ainda depende de decisão e bloqueia a release pública estável;
- nenhuma tag ou release deve ser criada antes de todos os critérios pendentes do 11.4D.
