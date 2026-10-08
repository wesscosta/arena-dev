# v0.9 — Final Architecture Gate

**Data:** 2026-10-07  
**Escopo:** AI-ready · shadow cutover · retirada segura do legado · release hardening  
**Estado:** gate concluído; v0.9.0 publicada/congelada. Cutover lógico permanece operacional e posterior à release.

## 1. Decisão

O fechamento da v0.9 não é uma nova rodada funcional. É um gate que precisa provar quatro propriedades:

1. o Learning Core é consultável de forma estruturada, sem interpretar UI ou texto solto;
2. Quiz, Poll e Word Cloud possuem evidência durável de equivalência entre legado e Interaction Core;
3. o cutover lógico só pode ocorrer quando a equivalência estiver comprovada;
4. remoção física do legado não pode destruir a janela de rollback da primeira release do novo core.

## 2. Session contract

O contrato de sessão já existe em `SessionRuntimeSnapshotService` e mantém o backend como autoridade de sessão/realtime.

Não é necessário criar um segundo aggregate de sessão apenas para cumprir o roadmap. O fechamento deve preservar esse contrato e reduzir gradualmente os runtimes especializados atrás dele.

## 3. AI-ready Gate

Foi adicionado um trace estruturado por `InteractionRun`:

`GET /api/learning-core/gate/runs/{runId}/trace`

O endpoint é teacher-only pela fronteira existente de `/api/**`.

O trace expõe, a partir de um único `runId`:

- sessão e lifecycle da execução;
- definição e schema version;
- provenance;
- ContentRef, quando a interação possui fonte de conteúdo;
- LearningTarget, quando pedagogicamente aplicável;
- participante;
- resposta bruta e revisão;
- avaliação, outcome, score, evaluator type/version e detalhes;
- resultado agregado;
- LearningEvidence e sua provenance.

O campo `aiReady` só é verdadeiro quando os requisitos aplicáveis àquela Interaction estão completos. `gaps` lista lacunas estruturais sem inferência textual.

### Conteúdo opcional não é dado ausente

`ContentRef` não é obrigatório para interações criadas ad hoc. Ausência de conteúdo relacionado é um estado válido.

O Quiz adaptado passou a registrar explicitamente:

`ContentRef(sourceType=ACTIVITY_QUESTION, sourceId=<questionId>)`

Isso preserva a fronteira: o core conhece uma referência de conteúdo, não a entidade `ActivityQuestion`.

## 4. Shadow evidence

A migration V48 cria `interaction_shadow_observations`.

Cada mutação legada com shadow ativo registra de forma durável:

- tipo: QUIZ, POLL ou WORD_CLOUD;
- id da rodada legada;
- InteractionRun correlata;
- estado da run;
- EQUIVALENT, MISMATCH ou SYNC_ERROR;
- diferenças detectadas;
- contagem canônica de respostas/participantes;
- timestamp.

O identificador legado é deliberadamente armazenado sem FK. A evidência de cutover deve sobreviver à retirada futura das tabelas legadas.

Falha ao persistir telemetria ou ao sincronizar shadow nunca quebra o fluxo de aula. O erro é registrado/logado e o legado continua íntegro enquanto for a autoridade.

## 5. Critério objetivo de cutover

`GET /api/learning-core/gate/cutover` retorna o gate por tipo.

O default é conservador:

- shadow habilitado;
- pelo menos **3 rodadas distintas encerradas** cuja observação mais recente seja EQUIVALENT;
- **zero** rodada da amostra com observação mais recente MISMATCH ou SYNC_ERROR;
- lifecycle automatizado e regressões do runtime verdes.

A amostra operacional padrão considera até 200 observações recentes por tipo e pode ser configurada por ambiente.

Uma execução feliz isolada não autoriza cutover.

## 6. Retirada segura do legado

Há duas retiradas diferentes e elas não devem ser confundidas.

### Cutover lógico

O Interaction Core torna-se a fonte oficial somente depois de o gate de equivalência ser aprovado e os contratos de API/realtime continuarem verdes.

### Remoção física

A exclusão de tabelas, links de strangler ou código de rollback fica **bloqueada na v0.9.0 inicial**.

Motivo: remover fisicamente o legado no mesmo release em que o novo core vira autoridade elimina o rollback de baixo risco. A primeira release após cutover deve manter o schema legado inerte durante ao menos uma janela de release/rollback.

A remoção física só é elegível depois de:

1. cutover lógico aprovado;
2. release com core autoritativo validada;
3. backup V48 restaurável;
4. ausência de rollback para o legado durante a janela acordada;
5. confirmação de que nenhum endpoint, realtime snapshot, relatório ou job consulta as tabelas antigas.

## 7. Configuração

Variáveis operacionais:

- `APP_LEARNING_CORE_QUIZ_SHADOW_ENABLED`;
- `APP_LEARNING_CORE_POLL_SHADOW_ENABLED`;
- `APP_LEARNING_CORE_WORD_CLOUD_SHADOW_ENABLED`;
- `APP_LEARNING_CORE_CUTOVER_MINIMUM_TERMINAL_ROUNDS`;
- `APP_LEARNING_CORE_CUTOVER_SAMPLE_SIZE`.

`application.yml` mantém shadows desligados por default genérico para não alterar ambientes implicitamente. O Compose da linha v0.9 os habilita por default para coletar evidência de qualificação.

## 8. Gate para freeze v0.9.0

O freeze da v0.9.0 valida que o mecanismo de shadow/cutover é seguro; ele **não exige que o cutover lógico já tenha ocorrido**. Exigir três rodadas reais por tipo antes da release criaria uma dependência circular: a própria v0.9 introduz a observabilidade durável necessária para colher essa amostra. Assim:

- a v0.9.0 pode ser publicada com o legado ainda autoritativo e shadows coletando evidência;
- `logicalCutoverReady=true` é pré-condição do **cutover operacional**, não do freeze desta release;
- `physicalLegacyRemovalReady=false` permanece obrigatório na v0.9.0.

Checklist do artefato candidato:

- [x] backend verde em V48 — **163 unitários + 109 integrações**, 0 falhas/erros;
- [x] AI-ready trace de uma Interaction real retorna `aiReady=true` e `gaps=[]` — coberto por `LearningCheckIT` com resposta, avaliação e LearningEvidence;
- [x] Quiz/Poll/Word Cloud shadow lifecycle verde em integração;
- [x] critérios de cutover automatizados e fail-closed — shadow habilitado, mínimo de 3 rodadas terminais equivalentes por tipo e zero mismatch/sync error não resolvido; a amostra operacional real será exigida quando o cutover for solicitado;
- [x] frontend tests/typecheck/build/lint/format verdes — **300/300** testes;
- [x] Chromium E2E completo verde no artefato candidato — **23/23**;
- [x] Compose isolado verde com shadows habilitados, coexistindo com a stack de desenvolvimento;
- [x] backup + checksum + restore validados em PostgreSQL 17 até **Flyway V48**;
- [x] acessibilidade/reflow dos fluxos alterados sem regressão nos breakpoints e temas cobertos;
- [x] documentação e manifests sincronizados em `0.9.0`;
- [x] CI do **mesmo SHA final** verde antes da tag/publicação.

### Evidência local de 2026-10-07

`scripts/release/release-gate.sh local` concluiu com sucesso no artefato candidato. A evidência local confirmou contratos v0.6 → v0.9, Flyway V48, backend, frontend, imagens Docker, stack isolada saudável, liveness/readiness e a suíte Chromium completa.

Também foi executado `backup-postgres.sh` seguido de `ARENA_SCHEMA_VERSION=48 verify-backup.sh`: o checksum SHA-256 foi validado e o dump foi restaurado em PostgreSQL 17 temporário, com as 48 migrations e contratos persistentes críticos presentes.

O teardown da suíte backend ainda emite um warning do Surefire ao encerrar o fork após os testes e o lint mantém warnings históricos de React. Nenhum deles produz falha de build. Eles permanecem como dívida do harness/qualidade e não devem ser “corrigidos” por downgrade de dependências ou aumento arbitrário de timeout.

O `npm audit --omit=dev --audit-level=high` retorna **0 vulnerabilidades de produção**. O grafo de desenvolvimento possui advisory alto na cadeia `eslint-config-next → fast-glob → micromatch → braces@3.0.3`; não existe versão corrigida de `braces` publicada no registry no momento e o fix sugerido pelo npm exige downgrade incompatível do toolchain, portanto não foi aplicado.

Como hardening de reprodutibilidade, os três jobs do CI foram fixados em `ubuntu-24.04` (em vez de `ubuntu-latest`) e o job frontend passou a executar também `lint` e `format:check`, alinhando o gate remoto ao gate local.

Estado final da linha: **v0.9.0 publicada e congelada em `main` após CI verde no mesmo SHA, backup/restore V48 e gate final de release**. O cutover lógico continua deliberadamente separado da publicação e depende da amostra operacional real dos shadows.
