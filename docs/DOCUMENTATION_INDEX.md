# Índice documental — Arena Dev

## Fontes correntes

1. [`../README.md`](../README.md) — visão pública e operacional do projeto.
2. [`STATUS_ATUAL.md`](STATUS_ATUAL.md) — estado técnico corrente.
3. [`HANDOFF_V0_9.md`](HANDOFF_V0_9.md) — handoff histórico da baseline v0.9.0.
4. [`v0.9/CURRENT_STATE_AUDIT.md`](v0.9/CURRENT_STATE_AUDIT.md) — estado implementado e próximos passos da v0.9.
5. [`ROADMAP_0_8.md`](ROADMAP_0_8.md) — roadmap histórico da baseline v0.8.
6. [`INCREMENT_16_3.md`](INCREMENT_16_3.md) — plano técnico de Journey Study Experience.
7. [`INCREMENT_16_2.md`](INCREMENT_16_2.md) — fechamento de Learning Resources & Content Ingestion.
8. [`INCREMENT_16_1.md`](INCREMENT_16_1.md) — fechamento do Journey Core.
9. [`INCREMENT_16_0.md`](INCREMENT_16_0.md) — fechamento do Professor Arena Experience.
10. [`INCREMENT_16_0R_SESSION_RANKING.md`](INCREMENT_16_0R_SESSION_RANKING.md) — evolução transversal: ranking autoritativo da sessão, projeção opcional, privacidade e realtime.
11. [`ROADMAP_0_7.md`](ROADMAP_0_7.md) — fechamento histórico da linha de integrações.
12. [`RELEASE_0_7.md`](RELEASE_0_7.md) — release publicada da v0.7.0.
13. [`RELEASE_0_8.md`](RELEASE_0_8.md) — contrato histórico da release v0.8.
14. [`RELEASE_0_9.md`](RELEASE_0_9.md) — registro de fechamento, gates e invariantes da v0.9.0.
15. [`ARCHITECTURE_STABILIZATION_GATE_V0_8.md`](ARCHITECTURE_STABILIZATION_GATE_V0_8.md) — gate transversal concluído antes da retomada do 16.5C.
16. [`CONTENT_CANONICAL_MARKDOWN.md`](CONTENT_CANONICAL_MARKDOWN.md) — contrato canônico de conteúdo da Biblioteca, outline e projeções Leitura/Estrutura/Mapa.
17. [`INCREMENT_16_5C_PLAN.md`](INCREMENT_16_5C_PLAN.md) — plano e registro da Semantic Content Foundation & Ingestion → Library.
18. [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
19. [`ACCESSIBILITY.md`](ACCESSIBILITY.md).
20. [`LEARNING_VALIDATION_ROADMAP.md`](LEARNING_VALIDATION_ROADMAP.md) — plano posterior para evidências, Mastery, revisão e progressão visual.
21. [`CLASSROOM_OVERVIEW_MVP_CONSOLIDATION.md`](CLASSROOM_OVERVIEW_MVP_CONSOLIDATION.md) — decisões e gates de Turmas/Biblioteca global, cards, temas e responsividade.
22. [`adr/README.md`](adr/README.md).

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

## Baseline publicada — v0.9

A v0.9.0 é o **Arena Learning Core** e está publicada/congelada. A linha consolidou Flyway V39–V48, `LearningTarget → Interaction → Response → Evaluation → Result → LearningEvidence`, o fluxo **Verificar aprendizagem**, trace AI-ready e shadow/cutover gate para Quiz, Poll e Word Cloud. O legado permanece autoritativo até o gate operacional aprovar o cutover real.

## Próxima linha planejada — v0.10

A linha **v0.10 — Learning Loop** está aberta em branch isolada, com [roadmap revisado](ROADMAP_V0_10.md) e [auditoria crítica de navegação, sorteio e materiais](AVALIACAO_V0_10_ARENA_MATERIAIS.md). Confidence, Before & After, Error Clinic e Recovery são incrementos planejados, não publicados. **Mastery v1 fica adiada até taxonomia e blueprint validados.**

## Baseline histórica — v0.8

O **Gate de Estabilização Arquitetural v0.8** foi concluído, `16.5C–F` foram fechados no escopo MVP e a v0.8.0 foi publicada/congelada.

Os incrementos `16.0 — Professor Arena Experience` e `16.1 — Journey Core` foram integrados à `main` pelos PRs #21 e #22.

O 16.2 — Learning Resources & Content Ingestion e o 16.3 — Study Experience & Structured Import estão concluídos. O 16.4 — Student Experience está implementado tecnicamente até 16.4D — Achievements Foundation. Em 16.5 — Content Library & Reuse, `16.5C–F` estão tecnicamente fechados: V38, canonicalização, ingestão revisável, Leitura/Estrutura/Mapa, discovery, revision awareness e portabilidade.

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

1. código, migrations e configuração da `main` publicada;
2. `STATUS_ATUAL.md`;
3. `v0.9/FINAL_ARCHITECTURE_GATE.md`;
4. `HANDOFF_V0_9.md` e `v0.9/CURRENT_STATE_AUDIT.md` como fechamento da baseline;
5. ADRs aceitos da v0.9;
6. `ROADMAP_0_8.md` e incrementos 16.x como histórico;
7. documentos históricos anteriores.

Não reescrever documentação histórica para fabricar evidência retroativa. Quando houver divergência entre fechamento técnico e publicação externa, registrar explicitamente a evidência disponível.

**Atualizado em 07/10/2026:** v0.9.0 está publicada/congelada em Flyway V48. A próxima linha planejada é v0.10 — Learning Loop; cutover lógico do legado permanece condicionado à evidência operacional real.
- [`CLOSURE_16_4_STUDENT_EXPERIENCE.md`](CLOSURE_16_4_STUDENT_EXPERIENCE.md) — fechamento do ciclo 16.4, decisões consolidadas, gates e pendências.
- [INCREMENT_16_4D.md](INCREMENT_16_4D.md) — Achievements Foundation: domínio, persistência, reconciliação, API, UX e gates.
- [INCREMENT_16_5_0_ARCHITECTURE_AUDIT.md](INCREMENT_16_5_0_ARCHITECTURE_AUDIT.md) — gate arquitetural da Content Library: LearningResource, ownership, snapshot, ingestão e migration strategy.
- [INCREMENT_16_5A.md](INCREMENT_16_5A.md) — Library Core: lifecycle global, revision, archive e snapshot Library → Journey.
- [INCREMENT_16_5B.md](INCREMENT_16_5B.md) — Library Workspace & Reuse: UX editorial, busca, lifecycle e reuso bidirecional com Journey.
- [INCREMENT_16_5C_PLAN.md](INCREMENT_16_5C_PLAN.md) — Planejamento de Semantic Content Foundation, ingestão canônica e preparação arquitetural para RAG.

## Sequência de fechamento v0.8

`Gate de Estabilização Arquitetural ✅ → 16.5C–F ✅ → Release Hardening ✅ → v0.8.0 ✅`.

`16.6 — Knowledge & Retrieval Foundation` é pós-v0.8/opcional e não bloqueia a release. O planejamento semântico/RAG inicial permanece em [`INCREMENT_16_5C_PLAN.md`](INCREMENT_16_5C_PLAN.md).

- [`INCREMENT_16_5B_2_SNAPSHOT_HARDENING.md`](INCREMENT_16_5B_2_SNAPSHOT_HARDENING.md) — integridade do snapshot Biblioteca → Journey e preservação de revisão em updates comuns.

## v0.10 — Decisões de produto (08/10/2026)

- [Roadmap técnico e critérios de release](ROADMAP_V0_10.md)
- [Plano técnico detalhado — visão e decomposição dos incrementos](v0.10/IMPLEMENTATION_PLAN.md)
- [Contratos API, dados e migrações](v0.10/API_CONTRACTS.md)
- [Wireflows de professor, aluno e projetor](v0.10/UX_FLOWS.md)
- [Matriz de testes e go/no-go](v0.10/TEST_MATRIX.md)
- [Registro da execução e pendências reais v0.10](v0.10/EXECUTION_STATUS.md)
- [Auditoria da Arena, sorteio e Canva/HTML](AVALIACAO_V0_10_ARENA_MATERIAIS.md)
- [ADR-0051 — Seleção e desfecho](adr/ADR-0051-selection-outcome-and-draw-policy.md)
- [ADR-0052 — Recursos externos](adr/ADR-0052-external-resources-as-placements.md)
- [ADR-0053 — Operador docente único e limites de segurança](adr/ADR-0053-single-operator-teacher-security-boundary.md)
- [ADR-0054 — Peer Instruction pelo LearningCycle](adr/ADR-0054-peer-instruction-through-learning-cycle.md)
- [ADR-0055 — Clínica do Erro com leitura docente](adr/ADR-0055-error-clinic-teacher-annotations.md)
- [ADR-0056 — Bootstrap em lote e mecânicas sob demanda](adr/ADR-0056-dashboard-batch-bootstrap-and-lazy-mechanics.md)
- [ADR-0057 — Reversão idempotente de XP](adr/ADR-0057-xp-reversal-idempotency-and-participation-independence.md)
- [ADR-0058 — PWA seguro e recuperação de conexão](adr/ADR-0058-pwa-versioned-offline-shell-and-connection-recovery.md)
- [ADR-0059 — Biblioteca contextual e material canônico na Arena](adr/ADR-0059-canonical-library-context-in-arena.md)
- [ADR-0060 — Autoconfiança opcional e recuperação com evidências](adr/ADR-0060-student-self-confidence-and-evidence-based-recovery.md)
- [ADR-0061 — Painel pedagógico docente com evidências reais](adr/ADR-0061-session-learning-overview-teacher-only.md)
- [ADR-0062 — Identidade da candidata v0.10 e backup V55](adr/ADR-0062-v010-release-candidate-schema-and-rollback-gate.md)
- [Gate GO/NO-GO v0.10](v0.10/RELEASE_CANDIDATE_CHECKLIST.md)
