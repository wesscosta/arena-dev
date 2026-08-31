# Incremento 11.4 — E2E, CI e release hardening

**Status:** parcial — fatias 11.4A e 11.4B implementadas e validadas localmente; 11.4C implementada, aguardando gate completo; 11.4D pendente.

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
- [ ] primeira execução concluída com sucesso no GitHub Actions;
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
- [ ] Compose de produção e imagens endurecidas são validados no Docker;
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

## Próxima fatia

### 11.4D — Release

- checklist operacional;
- evidências consolidadas;
- critérios de rollback e backup;
- decisão de tag da versão estável.

## Limites

- o workflow ainda não foi executado no GitHub e permanece **Implementado**, não **Validado**;
- Playwright foi validado localmente; o CI remoto ainda precisa registrar a execução verde;
- os defaults fracos permanecem somente no perfil de desenvolvimento; `prod` não os aceita;
- o overlay de produção pressupõe proxy TLS externo e não constitui sozinho uma plataforma completa de deploy;
- nenhuma tag ou release deve ser criada antes das fatias 11.4B–11.4D.
