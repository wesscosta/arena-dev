# Arena Dev v0.11 — execução e evidências

**Adendo documental (24/10/2026):** [reavaliação dos gates v0.11/v0.12 e próximos incrementos](../PRODUCT_REASSESSMENT_2026-10-24.md). A main avançou até as PRs #100/#101, porém os **oito gates operacionais da 11.6 continuam sem GO**. As melhorias de UX, modo professor e avaliações derivadas da Jornada estão em discovery/Figma e não alteram os critérios de release da 11.6.

**Baseline publicada:** `v0.10.0`. **v0.11 tecnicamente encerrada:** 11.0–11.6 integradas à `main`, último merge `2c1e011`, CI 3/3 aprovado no SHA. **11.6 operacional NO-GO:** testes físicos, piloto, segurança e rollback pendentes. **Sem tag/release estável v0.11.0.** Candidata congelada como pré-release **`v0.11.0-rc.1`** (19/10/2026), alvo dos 8 gates de campo. [Fechamento](11.6_TECHNICAL_CLOSURE_NO_GO_2026-10-10.md) · [v0.12](../ROADMAP_V0_12.md).

## 11.0 — itens entregues para revisão

- [Auditoria por persona e tela](11.0_AUDITORIA_PERSONAS_TELAS.md): rotas, tarefas, estados e cobertura versus lacunas de homologação.
- [Matriz de autorização e ameaças](11.0_PERMISSOES_AMENACAS.md): risco de exposição por código, revogação, CAS, segurança e testes negativos.
- [Contrato proposto do projetor v1](11.0_CONTRATOS_PROJECAO.md): snapshot imutável, palco único, eventos versionados, HTTP, WebSocket, sincronização e retorno seguro.
- [Plano de execução e gates](11.0_PLANO_GATES.md): sequência 11.1–11.6, condições de aceite e riscos residuais.
- [Evidências verificadas da etapa](11.0_EVIDENCIAS.md): comandos e resultados, limites do teste e pendências.
- [ADR-0067](../adr/ADR-0067-material-presentation-v011.md): contrato arquitetural aceito para o backend 11.1; decisões de sincronização futura ainda sujeitas à 11.3.

## 11.1 — backend de publicação segura

- [Execução 11.1](11.1_EXECUTION_STATUS.md): Flyway V57, snapshot por publicação, endpoints docentes/publicação projetor, LiveStage versionado, revogação e testes de segurança/concorrência.
- **Status:** PR #39 integrado à `main` após três jobs de CI aprovados. O snapshot e a revogação são baseline para 11.2.

## 11.2 — leitura pública segura e controles de apresentação

- [Execução 11.2](11.2_EXECUTION_STATUS.md): comando explícito no modal docente, renderização segura de Markdown/Notion no projetor, leitura por código de sessão e rolagem responsiva.
- **Status:** [PR #40](https://github.com/wesscosta/arena-dev/pull/40) integrado à main, com três jobs de CI aprovados no SHA ceb60cd. [Validação e limites](11.2_VALIDATION_CLOSURE_2026-10-10.md). A navegação sincronizada por anchorId pertence à 11.3.

## 11.3 — navegação sincronizada e recuperação de estado

- [Execução 11.3](11.3_EXECUTION_STATUS.md): V58 para idempotência, âncora validada contra snapshot, comando docente CAS, estágio versionado e reconciliação de eventos/reload.
- **Estado:** [PR #42](https://github.com/wesscosta/arena-dev/pull/42) aprovado em três jobs no SHA `f5526ba` e integrado à `main` (merge `7ffe27b`). [Validação e limites](11.3_VALIDATION_CLOSURE_2026-10-10.md). A release v0.11 ainda não está homologada.

## 11.4 — UI/UX, acessibilidade e Security Hardening

- [Auditoria, implementação, evidências e limites](11.4_SECURITY_UX_EXECUTION.md): renderer único de Markdown, CSP, foco/rolagem segura, breakpoints móveis e testes Chromium/WebKit.
- **Status:** [PR #45](https://github.com/wesscosta/arena-dev/pull/45) integrado, merge `1e3645e` e CI 3/3 aprovado (Chromium/WebKit). Emulação não substitui Safari/iOS físico, VoiceOver nem auditoria AAA.

## 11.5 — Discovery editorial e proveniência

- [Auditoria, direitos e inventário agregado](11.5_EDITORIAL_PROVENANCE_AUDIT.md) — dados de origem, 30 materiais ativos globais e 92 questões, sem exportar conteúdos.
- [Taxonomia e blueprint propostos](11.5_TAXONOMY_ASSESSMENT_BLUEPRINT.md) — `LearningTarget` existente, Atividades, competências e concursos.
- [Matriz de decisões e backlog](11.5_DECISIONS_AND_BACKLOG.md) — direitos, revisão humana, piloto editorial e limites.
- [ADR-0068 proposta](../adr/ADR-0068-editorial-provenance-taxonomy-proposal.md) — **sem aceite pedagógico/jurídico e sem DDL/API**.
- **Status:** discovery técnico em revisão. Direitos editoriais e piloto humano ainda pendentes.

## 11.6 — Gate técnico encerrado; homologação operacional pendente

**Gate técnico integrado e aprovado no CI da `main`; homologação em campo ainda não executada.** [Roteiro por dispositivo/ambiente](11.6_OPERATIONAL_HOMOLOGATION_PLAN.md), [evidências técnicas e pendências](11.6_TECHNICAL_EVIDENCE.md), [template NO-GO](11.6_ACCEPTANCE_TEMPLATE.json) e verificador fail-closed de oito requisitos obrigatórios. O WebKit emulado não substitui Safari físico, VoiceOver, PWA, rede real, piloto ou rollback. Não criar tag/release `v0.11.0` antes dos gates.

## 11.7 — Coerência visual com o Design System atual

- [Defeitos, causas, correções e evidência](11.7_COHERENCE_AA.md): papéis tipográficos, cor da turma por tema, textos abaixo de 12px nos painéis ao vivo. Sem redesign; axe e CSP `wss:` pendentes.

## Congelamento da candidata

1. A pré-release `v0.11.0-rc.1` congela o SHA da candidata. Gates de campo executam **somente** sobre esse SHA (ou uma `rc.N` posterior).
2. Mudanças aceitas daqui em diante: **apenas defeitos encontrados nos gates**. Cada correção gera nova `rc.N` e reteste do que ela afeta.
3. Publicação estável: após GO assinado, bump `0.11.0-rc.N` → `0.11.0`, backup e rollback compatíveis com V66, `release-gate.sh final --attestation` e tag `v0.11.0`.

## Disciplina de status

**Decisão de produto/contrato ≠ API funcionando.** A arquitetura e o escopo de 11.0 são uma especificação verificável do que implementar em 11.1, não uma prova de que endpoints de publicação, persistência ou projetor já existam. Inspeção de código não equivale a teste manual de UI/UX, WCAG ou iOS. A release v0.10 publicada não deve ser reaberta para inserir recursos v0.11.

## Gates subsequentes

11.0–11.6 integradas; **pacote técnico encerrado e congelado**. A release permanece **NO-GO operacional** até evidência real dos oito gates. Redesign e Active Learning foram reservados ao [roadmap v0.12](../ROADMAP_V0_12.md).

**Regressão integrada:** [11.10 — fechamento técnico](11.10_RELEASE_INTEGRATED_REGRESSION_2026-10-24.md). CI complementa e não substitui os testes de campo.

**Marco de 24/10/2026:** desenvolvimento **CONCLUÍDO** ([issue #37](https://github.com/wesscosta/arena-dev/issues/37)); homologação operacional e release estável pendentes na [issue #110](https://github.com/wesscosta/arena-dev/issues/110).
