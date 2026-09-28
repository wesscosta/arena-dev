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
10. [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
11. [`ACCESSIBILITY.md`](ACCESSIBILITY.md).
12. [`adr/README.md`](adr/README.md).

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

Os incrementos `16.0 — Professor Arena Experience` e `16.1 — Journey Core` foram integrados à `main` pelos PRs #21 e #22.

O `16.2 — Learning Resources & Content Ingestion` está concluído na branch `feat/v0.8-content-ingestion`. O `16.3` já cobre Study Experience e Structured Import até adapters/OAuth/UX do Notion. O `16.4 — Student Experience Shell & Workspace Visibility` está em execução; o [`16.4A — Student Workspace Visibility`](INCREMENT_16_4A.md) separa matrícula de exposição permanente do conteúdo e o [`16.4B — Live dentro do Student Shell`](INCREMENT_16_4B.md) adiciona discovery multi-turma e Live Hub reutilizando o runtime público, e o [`16.4C — Journey Discovery & Redemption`](INCREMENT_16_4C.md) permite vincular Jornadas ao perfil leve por código. Os três cortes estão implementados tecnicamente, restando o gate visual integrado. `16.4D — Achievements Foundation` fica reservado e não implementado. `16.5 — Content Library & Reuse` é o próximo domínio priorizado, começando pela auditoria de `LearningResource`.

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

**Atualizado em 28/09/2026 para consolidar 16.4A–C, reservar 16.4D sem implementação e preparar o gate de entrada do 16.5 — Content Library & Reuse.**
- [`CLOSURE_16_4_STUDENT_EXPERIENCE.md`](CLOSURE_16_4_STUDENT_EXPERIENCE.md) — fechamento do ciclo 16.4, decisões consolidadas, gates e pendências.
