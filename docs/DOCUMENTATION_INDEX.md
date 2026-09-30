# Índice documental — Arena Dev

## Fontes correntes

1. [`../README.md`](../README.md) — visão pública e operacional do projeto.
2. [`STATUS_ATUAL.md`](STATUS_ATUAL.md) — estado técnico corrente.
3. [`ROADMAP_0_8.md`](ROADMAP_0_8.md) — roadmap da linha ativa.
4. [`INCREMENT_16_3.md`](INCREMENT_16_3.md) — plano técnico de Journey Study Experience.
5. [`INCREMENT_16_2.md`](INCREMENT_16_2.md) — fechamento de Learning Resources & Content Ingestion.
6. [`INCREMENT_16_1.md`](INCREMENT_16_1.md) — fechamento do Journey Core.
7. [`INCREMENT_16_0.md`](INCREMENT_16_0.md) — fechamento do Professor Arena Experience.
8. [`ROADMAP_0_7.md`](ROADMAP_0_7.md) — fechamento histórico da linha de integrações.
9. [`RELEASE_0_7.md`](RELEASE_0_7.md) — release publicada da v0.7.0.
10. [`ARCHITECTURE_STABILIZATION_GATE_V0_8.md`](ARCHITECTURE_STABILIZATION_GATE_V0_8.md) — gate transversal de segurança, arquitetura, design system e quality gates antes de novos incrementos funcionais.
11. [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
12. [`ACCESSIBILITY.md`](ACCESSIBILITY.md).
13. [`adr/README.md`](adr/README.md).

## Baseline encerrada — v0.6

- [`ROADMAP_0_6.md`](ROADMAP_0_6.md) — fechamento histórico da linha;
- [`RELEASE_0_6.md`](RELEASE_0_6.md) — registro de fechamento e evidências de publicação;
- [`INCREMENT_14_0.md`](INCREMENT_14_0.md) até [`INCREMENT_14_11.md`](INCREMENT_14_11.md);
- [`POLISH_14_11A_UI_DECLUTTER.md`](POLISH_14_11A_UI_DECLUTTER.md);
- [`POLISH_14_11B_TYPOGRAPHY_AND_SESSION_EXIT.md`](POLISH_14_11B_TYPOGRAPHY_AND_SESSION_EXIT.md);
- [`POLISH_14_11C_UI_FINAL.md`](POLISH_14_11C_UI_FINAL.md).

## ADRs relevantes da v0.6

- [`adr/ADR-0043-activitysubmission-fonte-de-verdade-e-ia-supervisionada.md`](adr/ADR-0043-activitysubmission-fonte-de-verdade-e-ia-supervisionada.md);
- [`adr/ADR-0044-submissionitem-entrega-polimorfica.md`](adr/ADR-0044-submissionitem-entrega-polimorfica.md).

## Linha ativa — v0.8

Em 30/09/2026 foi aberto o **Gate de Estabilização Arquitetural v0.8**. Ele tem precedência operacional sobre `16.5C` e novos incrementos funcionais até fechar segurança, baseline, Arena Live Shell, CSS/design ownership, boundaries backend e quality gates.

Os incrementos `16.0 — Professor Arena Experience` e `16.1 — Journey Core` foram integrados à `main` pelos PRs #21 e #22.

O 16.2 — Learning Resources & Content Ingestion e o 16.3 — Study Experience & Structured Import estão concluídos. O 16.4 — Student Experience está implementado tecnicamente até 16.4D — Achievements Foundation. Em 16.5 — Content Library & Reuse, a auditoria arquitetural, Library Core, workspace/reuse, refinamento editorial e snapshot hardening estão implementados até 16.5B.2; `16.5C — Semantic Content Foundation & Ingestion → Library` permanece planejado para depois do Gate de Estabilização Arquitetural.

## Histórico

### v0.5
- [`ROADMAP_0_5.md`](ROADMAP_0_5.md);
- [`RELEASE_0_5_0.md`](RELEASE_0_5_0.md);
- `INCREMENT_13_*`;
- ADR-0033 até ADR-0042.

### v0.4
- [`ROADMAP_0_4.md`](ROADMAP_0_4.md);
- `INCREMENT_12_*`;
- [`RELEASE_0_4_0.md`](RELEASE_0_4_0.md).

### anteriores
- [`RELEASE_0_3_0.md`](RELEASE_0_3_0.md).

## Regra de precedência

1. código, migrations e configuração da branch ativa;
2. `STATUS_ATUAL.md`;
3. `ROADMAP_0_8.md`;
4. `INCREMENT_16_3.md`;
5. `INCREMENT_16_2.md`;
6. ADRs aceitos;
7. documentos históricos.

Não reescrever documentação histórica para fabricar evidência retroativa. Quando houver divergência entre fechamento técnico e publicação externa, registrar explicitamente a evidência disponível.

**Atualizado em 30/09/2026:** 16.4 está concluído até 16.4D, 16.5 está implementado até 16.5B.2 e o Gate de Estabilização Arquitetural tem precedência antes de 16.5C.
- [`CLOSURE_16_4_STUDENT_EXPERIENCE.md`](CLOSURE_16_4_STUDENT_EXPERIENCE.md) — fechamento do ciclo 16.4, decisões consolidadas, gates e pendências.
- [INCREMENT_16_4D.md](INCREMENT_16_4D.md) — Achievements Foundation: domínio, persistência, reconciliação, API, UX e gates.
- [INCREMENT_16_5_0_ARCHITECTURE_AUDIT.md](INCREMENT_16_5_0_ARCHITECTURE_AUDIT.md) — gate arquitetural da Content Library: LearningResource, ownership, snapshot, ingestão e migration strategy.
- [INCREMENT_16_5A.md](INCREMENT_16_5A.md) — Library Core: lifecycle global, revision, archive e snapshot Library → Journey.
- [INCREMENT_16_5B.md](INCREMENT_16_5B.md) — Library Workspace & Reuse: UX editorial, busca, lifecycle e reuso bidirecional com Journey.
- [INCREMENT_16_5C_PLAN.md](INCREMENT_16_5C_PLAN.md) — Planejamento de Semantic Content Foundation, ingestão canônica e preparação arquitetural para RAG.

## Sequência de fechamento v0.8

`Gate de Estabilização Arquitetural → 16.5C → 16.5D → 16.5E → 16.5F → Release Hardening → v0.8`.

`16.6 — Knowledge & Retrieval Foundation` é pós-v0.8/opcional e não bloqueia a release. O planejamento semântico/RAG inicial permanece em [`INCREMENT_16_5C_PLAN.md`](INCREMENT_16_5C_PLAN.md).

- [`INCREMENT_16_5B_2_SNAPSHOT_HARDENING.md`](INCREMENT_16_5B_2_SNAPSHOT_HARDENING.md) — integridade do snapshot Biblioteca → Journey e preservação de revisão em updates comuns.
