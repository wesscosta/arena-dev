# v0.9 — Final Architecture Gate

**Data:** 2026-10-07  
**Escopo:** AI-ready · shadow cutover · retirada segura do legado · release hardening  
**Estado:** gate implementado; freeze/publicação dependem da evidência final.

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

A release só pode ser declarada congelada quando:

- [x] backend unit/integration verde em V48 — 109 testes, 0 falhas/erros;
- [x] AI-ready trace de uma Interaction real retorna `aiReady=true` — coberto por `LearningCheckIT` com avaliação e LearningEvidence;
- [x] Quiz/Poll/Word Cloud shadow lifecycle verde em integração;
- [ ] qualificação operacional de cutover sem mismatches — a regra está automatizada e testada, mas a amostra real mínima de 3 rodadas terminais por tipo ainda precisa ser coletada no ambiente candidato;
- [x] frontend tests/typecheck/build/lint/format verdes — 298 testes após consolidação do contrato de release;
- [ ] Chromium E2E crítico/completo verde no artefato candidato;
- [ ] Compose isolado verde com shadows habilitados — o Compose foi endurecido para permitir stacks paralelas sem `container_name` global, mas a validação local do artefato foi interrompida por travamento do BuildKit durante a resolução de dependências, sem erro de aplicação;
- [ ] backup/restore validado até V48;
- [x] acessibilidade/reflow dos fluxos alterados sem regressão nos testes automatizados existentes;
- [x] documentação e manifests sincronizados em `0.9.0`;
- [ ] CI do mesmo SHA verde.

### Evidência local de 2026-10-07

O gate local confirmou os contratos arquiteturais de v0.6 → v0.9, Flyway V48, backend, frontend e o comportamento do AI-ready/shadow gate. O teardown do backend ainda emite um warning do Surefire ao encerrar o fork após os testes; o build permanece `SUCCESS` e não há falha funcional. Esse ruído deve ser tratado como dívida do harness de testes, não mascarado por aumento arbitrário de timeout.

A tentativa de Compose isolado também revelou e corrigiu uma fragilidade real: `container_name` fixo impedia duas stacks coexistirem. Os nomes fixos foram removidos e o release gate passou a depender do namespace do Compose. A construção seguinte avançou corretamente, mas o BuildKit local deixou de produzir progresso durante `dependency:go-offline`; por isso Compose/E2E não são marcados como aprovados sem evidência.

Até os itens operacionais restantes serem comprovados, o estado correto é **release candidate 0.9.0 com gate arquitetural implementado**, não `v0.9.0 publicada/congelada`.
