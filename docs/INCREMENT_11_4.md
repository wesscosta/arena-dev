# Incremento 11.4 — E2E, CI e release hardening

**Status:** parcial — fatia 11.4A implementada; execução no GitHub Actions e fatias 11.4B–11.4D pendentes.

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

## Próximas fatias

### 11.4B — E2E com Playwright

- autenticação do professor;
- seleção de turma e entrada na Arena;
- join do participante;
- expiração/reconexão;
- evidência em navegador real com backend e PostgreSQL.

### 11.4C — Hardening de configuração e dependências

- defaults e secrets de produção;
- cookies, CORS e CSRF;
- configuração Compose de produção;
- auditoria de dependências e imagens;
- política de atualização automatizada.

### 11.4D — Release

- checklist operacional;
- evidências consolidadas;
- critérios de rollback e backup;
- decisão de tag da versão estável.

## Limites

- o workflow ainda não foi executado no GitHub e permanece **Implementado**, não **Validado**;
- Playwright não foi adicionado nesta fatia;
- os defaults de desenvolvimento e os limites de segurança documentados continuam inalterados;
- nenhuma tag ou release deve ser criada antes das fatias 11.4B–11.4D.
