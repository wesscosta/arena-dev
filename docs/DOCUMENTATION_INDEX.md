# Índice documental — Arena Dev

Este índice separa **fontes operacionais vigentes**, **propostas**, **diários de execução** e **histórico**. Um plano não é evidência de implementação; testes locais não são autorização de release.

## Leitura atual (v0.10 publicada)

| Pergunta | Fonte |
| --- | --- |
| Qual versão está publicada? | [Estado atual](STATUS_ATUAL.md) e [release v0.10.0](RELEASE_0_10.md) |
| O que está planejado e o que ficou fora? | [Roadmap v0.10](ROADMAP_V0_10.md), [plano técnico](v0.10/IMPLEMENTATION_PLAN.md) |
| O que foi executado? | [Diário de execução](v0.10/EXECUTION_STATUS.md) (registros datados, não estado automático) |
| Qual o aceite da v0.10? | [Registro do operador](v0.10/OPERATOR_ACCEPTANCE_2026-10-10.md), [checklist histórico](v0.10/RELEASE_CANDIDATE_CHECKLIST.md) e [gate técnico](RELEASE_0_10.md) |
| Quais são os contratos? | [API/dados](v0.10/API_CONTRACTS.md) e [ADRs](adr/README.md) |
| Como devem funcionar os fluxos? | [UX v0.10](v0.10/UX_FLOWS.md) e [sistema visual](ux/arena-dynamics-visual-system-v010.md) |
| Quais riscos e excessos foram encontrados? | [Auditoria de consolidação](v0.10/AUDITORIA_CONSOLIDACAO_2026-10-09.md) |

## Linha ativa v0.11 (planejamento de implementação)

- [Índice 11.0 e evidências](v0.11/README.md) · [auditoria por persona/tela](v0.11/11.0_AUDITORIA_PERSONAS_TELAS.md) · [permissões e ameaças](v0.11/11.0_PERMISSOES_AMENACAS.md).
- [Contrato de apresentação e versionamento proposto](v0.11/11.0_CONTRATOS_PROJECAO.md) · [plano e gates](v0.11/11.0_PLANO_GATES.md) · [ADR-0067](adr/ADR-0067-material-presentation-v011.md).
- [Resultados e limites da auditoria 11.0](v0.11/11.0_EVIDENCIAS.md).
- [Implementação e testes de backend 11.1](v0.11/11.1_EXECUTION_STATUS.md) — PR #39 integrado; ainda não é release v0.11.
- [Implementação do leitor de material 11.2](v0.11/11.2_EXECUTION_STATUS.md) — interface docente/projetor e regressão E2E; [fechamento validado](v0.11/11.2_VALIDATION_CLOSURE_2026-10-10.md).
- [Implementação de navegação e reconexão 11.3](v0.11/11.3_EXECUTION_STATUS.md) — idempotência V58, seção ativa e eventos versionados. [Validação da 11.3](v0.11/11.3_VALIDATION_CLOSURE_2026-10-10.md).
- [Auditoria, hardening e testes 11.4](v0.11/11.4_SECURITY_UX_EXECUTION.md) — CSP, leitores de Markdown, UI/UX, WebKit mobile e gates Safari/iOS.
- [Discovery 11.5 — inventário editorial](v0.11/11.5_EDITORIAL_PROVENANCE_AUDIT.md) · [taxonomia/blueprint](v0.11/11.5_TAXONOMY_ASSESSMENT_BLUEPRINT.md) · [decisões e backlog](v0.11/11.5_DECISIONS_AND_BACKLOG.md). Sem DDL/API; [11.6 roteiro operacional](v0.11/11.6_OPERATIONAL_HOMOLOGATION_PLAN.md) · [evidências/status NO-GO](v0.11/11.6_TECHNICAL_EVIDENCE.md).
- **Nota:** a v0.10 está publicada; o trabalho documental 11.0 não significa feature 11.1 executada.

## Contratos técnicos e de experiência

- [ADR-0066 — XP manual idempotente V56](adr/ADR-0066-manual-score-creation-idempotency.md).
- [Design System](DESIGN_SYSTEM.md), [UI Style Guide](STYLE_GUIDE_UI.md), [Acessibilidade](ACCESSIBILITY.md).
- [Student Shell](STUDENT_SHELL_STYLE_GUIDE.md), [Biblioteca/Markdown canônico](CONTENT_CANONICAL_MARKDOWN.md).
- [Seleção e XP no Sorteio](ux/arena-draw-outcome-contract-v010.md), [Modais](ux/dialog-interaction-contract.md), [Navegação móvel](ux/arena-mobile-navigation.md).
- [Rollback técnico sintético V48→V56→V48 (10/10)](v0.10/ROLLBACK_V56_SYNTHETIC_2026-10-10.md) — não substitui rollback operacional.
- [Matriz técnica de testes](v0.10/TEST_MATRIX.md), [notas preparatórias da release](RELEASE_0_10.md), [navegação móvel](ux/arena-mobile-navigation.md) e [planejamento v0.11 de projeção de materiais](ROADMAP_V0_11.md).

## Linha de evolução anterior (histórico, não tarefas abertas da v0.10)

- [v0.9.0](RELEASE_0_9.md), [handoff v0.9](HANDOFF_V0_9.md), [gate arquitetural](v0.9/FINAL_ARCHITECTURE_GATE.md).
- [v0.8](RELEASE_0_8.md), [roadmap v0.8](ROADMAP_0_8.md), [16.4](CLOSURE_16_4_STUDENT_EXPERIENCE.md), [16.5 Biblioteca](INCREMENT_16_5C_PLAN.md).
- [v0.7](RELEASE_0_7.md), [v0.6](RELEASE_0_6.md), [v0.5](RELEASE_0_5_0.md), [v0.4](RELEASE_0_4_0.md), [v0.3](RELEASE_0_3_0.md).
- Incrementos individuais `INCREMENT_12_*`, `INCREMENT_13_*`, `INCREMENT_14_*`, `INCREMENT_15_*`, `INCREMENT_16_*` e relatórios `POLISH_*` preservados como evidência histórica; não listados um a um no README.

## Regra de precedência

1. Para **versão publicada**: tag/commit efetivo na `main`, migration e build correspondente, com evidência de release.
2. Para **desenvolvimento v0.11**: branch/commit efetivo, auditoria/ADR e evidências no SHA testado. Documentos 11.0 não implicam implementação 11.1. Para detalhes da candidata histórica v0.10, consulte o [checklist de release](v0.10/RELEASE_CANDIDATE_CHECKLIST.md) e o [aceite operacional](v0.10/OPERATIONAL_ACCEPTANCE.md).
3. Para **decisões de domínio e segurança**: ADR vigente/contratos e testes.
4. [Execução](v0.10/EXECUTION_STATUS.md) é diário datado: resultados antigos não validam automaticamente o código novo.
5. Roadmaps, wireframes e incrementos históricos **não** sobrepõem o comportamento implementado.

**Nunca reescrever uma decisão histórica para fabricar prova retroativa.** Documente a mudança, mantenha a autoria e só altere estado oficial quando houver evidência.
