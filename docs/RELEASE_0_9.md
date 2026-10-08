# Arena Dev v0.9.0 — Arena Learning Core

**Estado:** candidata final à publicação/congelamento
**Schema:** Flyway V1–V48
**Licença:** Arena Dev Proprietary License
**Base anterior:** v0.8.0 — Professor Experience, Journey & Content Library

## Escopo encerrado

A v0.9 cria a fundação pedagógica estruturada necessária para evoluir a Arena sem acoplar IA, Mastery ou novas experiências a modelos frágeis de runtime.

- `LearningTarget`, `ContentRef` e `Provenance` formam a base semântica;
- `InteractionDefinition → InteractionRun → Response → Evaluation → Result` consolida o Interaction Core;
- `LearningEvidence` registra evidência pedagógica estruturada;
- **Verificar aprendizagem** prova o primeiro fluxo nativo ponta a ponta, sem XP automático;
- Quiz, Poll e Word Cloud operam com adapters/shadow validation sobre o novo core;
- trace estruturado por `InteractionRun` expõe proveniência, resposta, avaliação, resultado e Evidence sem interpretar UI;
- `interaction_shadow_observations` registra `EQUIVALENT`, `MISMATCH` e `SYNC_ERROR` de forma durável;
- o gate de cutover é fail-closed e exige evidência operacional real.

## Invariantes da release

- o backend continua autoridade de sessão/realtime;
- `ScoreEvent` continua fonte de verdade de XP;
- LearningEvidence não equivale a XP nem a Mastery;
- Poll continua opinião não avaliativa;
- ContentRef referencia conteúdo sem acoplar o core à entidade legada;
- ausência de ContentRef em Interaction ad hoc é estado válido;
- falha de shadow nunca pode derrubar o fluxo legado enquanto ele for autoridade;
- publicação da v0.9.0 não executa cutover lógico automaticamente;
- remoção física do legado é proibida na primeira release do novo core.

## Cutover e rollback

O endpoint `/api/learning-core/gate/cutover` qualifica Quiz, Poll e Word Cloud. O default operacional exige por tipo:

- shadow habilitado;
- pelo menos 3 rodadas distintas encerradas cuja observação mais recente seja `EQUIVALENT`;
- zero `MISMATCH` ou `SYNC_ERROR` não resolvido na amostra.

Enquanto esse gate não aprovar a amostra real, o legado permanece autoritativo. Mesmo após o cutover lógico, as tabelas e caminhos de rollback permanecem preservados durante uma janela de release. A remoção física só pode ocorrer depois dessa janela e de nova validação de backup/restore.

## AI-ready gate

Uma Interaction real deve ser consultável de forma estruturada por:

`GET /api/learning-core/gate/runs/{runId}/trace`

O fluxo nativo `LearningCheckIT` prova `aiReady=true`, `gaps=[]`, LearningTarget, resposta bruta, avaliação, evaluator/version, resultado e LearningEvidence no mesmo trace.

## Evidência técnica de fechamento

A baseline v0.9.0 foi qualificada com:

- backend: **163 testes unitários + 109 integrações**;
- frontend: **300/300 testes**, lint, format check, TypeScript e production build;
- Chromium E2E: **23/23**;
- Compose isolado saudável, com backend/frontend executando como usuário non-root;
- Flyway V1–V48;
- backup PostgreSQL 17 em formato custom + checksum SHA-256;
- restore do backup validado até V48 e contratos persistentes críticos;
- `npm audit --omit=dev --audit-level=high` sem vulnerabilidades high/critical em produção;
- CI fixado em Ubuntu 24.04 para reduzir variação de runner;
- gate final executado na `main` contra o mesmo SHA que recebe a tag.

O gate formal é:

```bash
scripts/release/release-gate.sh final \
  --ci-run-url <URL_DA_EXECUCAO_VERDE> \
  --backup <CAMINHO_DO_DUMP>
```

## Fora do escopo da v0.9

- cutover lógico automático na publicação;
- remoção física do legado;
- Mastery avançado;
- Confidence como experiência completa;
- Before & After;
- Error Clinic;
- Recovery Round;
- geração por IA;
- RAG/embeddings/vector store;
- agentes;
- banco completo de questões;
- novos game modes.

## Pós-v0.9

A linha v0.9 entra em **feature freeze**. Correções `v0.9.x` ficam restritas a regressões, segurança, acessibilidade crítica, compatibilidade e documentação. Novas capacidades seguem para **v0.10 — Learning Loop**.
