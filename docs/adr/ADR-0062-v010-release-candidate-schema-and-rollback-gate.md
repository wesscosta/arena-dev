# ADR-0062 — Candidata v0.10, contrato V55 e rollback comprovável

**Data:** 08/10/2026 · **Estado:** aceita e aplicada na branch `feat/v0.10-learning-loop`. Não autoriza publicação.

## Problema observado

A branch v0.10 já continha Flyway V49–V55 e novas APIs, mas `backend/pom.xml` e frontend `package.json`/`package-lock.json` ainda anunciavam `0.9.0`. O `release-gate.sh` só escolhia contratos até v0.9/V48 e entregava `ARENA_SCHEMA_VERSION=48` ao verificador de backup. Um backup V55 íntegro seria então **reprovado pelo gate final errado**, e um binário de v0.10 seria indistinguível da versão v0.9 congelada.

## Decisões implementadas

1. **Metadados da branch:** artefatos Java/Node/npm lock convergidos para **`0.10.0-rc.1`**, sem tag, merge, release GitHub, deploy ou alteração nos snapshots da v0.9. `check-metadata.sh` valida os quatro locais como antes.
2. **Contrato aditivo:** `scripts/release/verify-v0.10-contract.sh` executa primeiro os contratos v0.6→v0.9, depois exige **V49–V55** de forma não duplicada e presença de componentes de ciclo, sorteio protegido, biblioteca contextual, confiança do estudante, painel docente e PWA. Aceita identificação `0.10.0-rc.N` enquanto candidata e `0.10.0` para release estável posterior, mas rejeita um binário rotulado 0.9.0.
3. **Gate de release:** quando V55 existe, `release-gate.sh local/final` exige o contrato v0.10 e usa **V55** para validar o dump restaurado, sem mudar o gate V48 de uma checkout da v0.9. A modalidade `final` para v0.10 exige **versão estável `0.10.0`**, branch `main` limpa/sincronizada, CI verde no mesmo commit, dump e SHA-256, restauração e testes. Tentar `final` com `0.10.0-rc.1` é recusado antes de quaisquer operações de release. Não cria tag nem publica automaticamente.
4. **Restore real:** `verify-backup.sh` detecta por padrão a última migração da checkout (V55 agora; V48 na v0.9). O override `ARENA_SCHEMA_VERSION` mantém a capacidade de validar dumps históricos. V55 exige sete tabelas e três colunas críticas de intervenção, reversão XP e autoconfiança, além da baseline v0.9, com SHA-256 e `pg_restore --exit-on-error` em PostgreSQL 17 efêmero.
5. **CI:** o job de integração/E2E chama o contrato v0.10 quando a migração V55 está presente; a v0.9 preserva sua verificação anterior. O gate completo foi posteriormente aprovado no SHA de implementação `7cf22a9` (GitHub Actions #37864958170, três jobs verdes).

## Evidências/escopo de testes

- `check-metadata.sh --require-license`, `bash -n scripts/release/*.sh` e `verify-v0.10-contract.sh` passaram com a identificação `0.10.0-rc.1`.
- Dump consistente e checksum do **banco de desenvolvimento** foram criados em diretório **local e não versionado**, com permissão restrita. Restaurados em PostgreSQL 17 temporário: **V55 e contratos críticos aprovados**. Com `ARENA_SCHEMA_VERSION=48`, o mesmo dump foi intencionalmente rejeitado (`55 migrations numéricas; esperado 48`). O banco de origem não foi modificado pelo ensaio.
- Execução de `release-gate.sh final --ci-run-url ... --backup ...` na branch candidata foi **bloqueada** por exigência de versão `0.10.0` estável. O script não fez merge, não criou tag e não publicou.
- O primeiro gate local completo mostrou **backend Maven verify verde**, mas detectou um teste estático do frontend ainda esperando `ARENA_SCHEMA_VERSION:-38`. A asserção estava obsoleta frente à detecção dinâmica do schema e foi **substituída por testes explícitos** da rota V55, fallback V48/V38, metadados de RC e bloqueios de publicação. Frontend após correção: **312/312 testes, 0 falhas**. O retry posterior concluiu com exit 0 no mesmo SHA; ver evidência abaixo.
- **Resultado final do retry:** `release-gate.sh local` exit 0, backend **195 Surefire + 122 Failsafe**, frontend **312/312**, auditoria 0 vulnerabilidades no escopo configurado, Docker Compose com backend/frontend/Postgres saudáveis e não-root, liveness/readiness aprovados e **35/35 Playwright Chromium**. Evidência local ignorada por Git: `release-evidence/v0.10.0-rc.1-local-20261009T003721Z.log`. CI GitHub Actions [#37864958170](https://github.com/wesscosta/arena-dev/actions/runs/37864958170), SHA `7cf22a9`, backend/frontend/Compose+E2E todos com `success`. A execução anterior falhou somente por teste estático desatualizado, corrigido antes do retry.

## Limites e gates remanescentes

Este ensaio comprova que um **dump do desenvolvimento com V55** pode ser restaurado, **não** que rollback de binário v0.10→v0.9 com dados novos funcione ou que exista um backup de produção. Para a versão final, simular upgrade de um banco sanitizado da v0.9, manter dump de pré-migração, aplicar V49–V55, validar integridade, testar retorno à v0.9 num banco isolado/restaurado, tempo de recuperação, compatibilidade com cliente antigo e documentar a janela de manutenção. Não usar dados reais em serviços externos de teste.

Permanecem bloqueadores manuais: PWA v0.9 previamente instalada em Android/iOS, rede móvel intermitente sob latência, navegação com leitor de tela e zoom alto, piloto docente e decisões de propriedade multi-professor (ADR-0053). **A v0.10 não foi publicada por esta decisão.**

## Revisão do Dockerfile após ensaio de ambiente limpo

O primeiro rebuild de imagem após mudar a versão do POM invalidou o layer de `mvn dependency:go-offline`, que começou a resolver **plugins não necessários para produzir a API** (site/deploy) e permaneceu demorando vários minutos. Essa etapa não era condição pedagógica ou de segurança, mas tornava o gate de release desnecessariamente lento e sujeito ao catálogo de plugins remotos.

`backend/Dockerfile` foi simplificado: preserva build multi-stage Java 21 e runtime não-root, aplica **cache Maven persistente do BuildKit** (`RUN --mount=type=cache,target=/root/.m2`) e executa apenas `mvn -Dmaven.test.skip=true package` **no estágio de produção da imagem**. A suíte completa de testes **não foi removida do CI ou do release gate**: `mvn verify` continua obrigatório e foi aprovado na tentativa anterior. O cache não é copiado para o runtime. A nova imagem foi construída com `BUILD SUCCESS` / exit 0 no retry e aprovada na stack isolada com os testes E2E. Isso conclui o **gate automatizado da candidata**, mas não os gates manuais/operacionais que ainda bloqueiam a v0.10 estável.
