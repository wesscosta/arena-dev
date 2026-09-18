# Índice documental — Arena Dev

## Fontes correntes

1. [`../README.md`](../README.md) — visão pública e operacional do projeto.
2. [`STATUS_ATUAL.md`](STATUS_ATUAL.md) — estado técnico corrente.
3. [`ROADMAP_0_7.md`](ROADMAP_0_7.md) — linha ativa e sequência das integrações educacionais.
4. [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
5. [`ACCESSIBILITY.md`](ACCESSIBILITY.md).
6. [`adr/README.md`](adr/README.md).

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

## Linha ativa — v0.7

A execução começa no `15.0 — Integration Core Consolidation`.

A primeira fatia é `15.0A — Audit & Contract Freeze`, auditando o que foi criado no `14.10 / V25` antes de qualquer Microsoft Graph ou Google API.

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

1. código, migrations e configuração da `main`;
2. `STATUS_ATUAL.md`;
3. `ROADMAP_0_7.md`;
4. ADRs aceitos;
5. documentos históricos.

Não reescrever documentação histórica para fabricar evidência retroativa. Quando houver divergência entre fechamento técnico e publicação externa, registrar explicitamente a evidência disponível.

**Atualizado em 17/09/2026 para o fechamento da baseline v0.6 e abertura documental da v0.7.**
