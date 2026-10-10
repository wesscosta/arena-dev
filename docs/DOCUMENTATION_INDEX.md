# Índice documental — Arena Dev

Este índice separa **fontes operacionais vigentes**, **propostas**, **diários de execução** e **histórico**. Um plano não é evidência de implementação; testes locais não são autorização de release.

## Leitura atual (v0.10 candidata)

| Pergunta | Fonte |
| --- | --- |
| Qual versão está publicada? | [Estado atual](STATUS_ATUAL.md) e [release v0.9.0](RELEASE_0_9.md) |
| O que está planejado e o que ficou fora? | [Roadmap v0.10](ROADMAP_V0_10.md), [plano técnico](v0.10/IMPLEMENTATION_PLAN.md) |
| O que foi executado? | [Diário de execução](v0.10/EXECUTION_STATUS.md) (registros datados, não estado automático) |
| Podemos publicar? | [Checklist de release](v0.10/RELEASE_CANDIDATE_CHECKLIST.md) e [aceite operacional](v0.10/OPERATIONAL_ACCEPTANCE.md) |
| Quais são os contratos? | [API/dados](v0.10/API_CONTRACTS.md) e [ADRs](adr/README.md) |
| Como devem funcionar os fluxos? | [UX v0.10](v0.10/UX_FLOWS.md) e [sistema visual](ux/arena-dynamics-visual-system-v010.md) |
| Quais riscos e excessos foram encontrados? | [Auditoria de consolidação](v0.10/AUDITORIA_CONSOLIDACAO_2026-10-09.md) |

## Contratos técnicos e de experiência

- [ADR-0066 — XP manual idempotente V56](adr/ADR-0066-manual-score-creation-idempotency.md).
- [Design System](DESIGN_SYSTEM.md), [UI Style Guide](STYLE_GUIDE_UI.md), [Acessibilidade](ACCESSIBILITY.md).
- [Student Shell](STUDENT_SHELL_STYLE_GUIDE.md), [Biblioteca/Markdown canônico](CONTENT_CANONICAL_MARKDOWN.md).
- [Seleção e XP no Sorteio](ux/arena-draw-outcome-contract-v010.md), [Modais](ux/dialog-interaction-contract.md), [Navegação móvel](ux/arena-mobile-navigation.md).
- [Matriz técnica de testes](v0.10/TEST_MATRIX.md), [notas preparatórias da release](RELEASE_0_10.md).

## Linha de evolução anterior (histórico, não tarefas abertas da v0.10)

- [v0.9.0](RELEASE_0_9.md), [handoff v0.9](HANDOFF_V0_9.md), [gate arquitetural](v0.9/FINAL_ARCHITECTURE_GATE.md).
- [v0.8](RELEASE_0_8.md), [roadmap v0.8](ROADMAP_0_8.md), [16.4](CLOSURE_16_4_STUDENT_EXPERIENCE.md), [16.5 Biblioteca](INCREMENT_16_5C_PLAN.md).
- [v0.7](RELEASE_0_7.md), [v0.6](RELEASE_0_6.md), [v0.5](RELEASE_0_5_0.md), [v0.4](RELEASE_0_4_0.md), [v0.3](RELEASE_0_3_0.md).
- Incrementos individuais `INCREMENT_12_*`, `INCREMENT_13_*`, `INCREMENT_14_*`, `INCREMENT_15_*`, `INCREMENT_16_*` e relatórios `POLISH_*` preservados como evidência histórica; não listados um a um no README.

## Regra de precedência

1. Para **versão publicada**: tag/commit efetivo na `main`, migration e build correspondente, com evidência de release.
2. Para **candidata v0.10**: código da branch/commit analisado, [checklist de release](v0.10/RELEASE_CANDIDATE_CHECKLIST.md), [aceite operacional](v0.10/OPERATIONAL_ACCEPTANCE.md) e CI **no mesmo SHA**. O estado local não deve ser chamado de publicado.
3. Para **decisões de domínio e segurança**: ADR vigente/contratos e testes.
4. [Execução](v0.10/EXECUTION_STATUS.md) é diário datado: resultados antigos não validam automaticamente o código novo.
5. Roadmaps, wireframes e incrementos históricos **não** sobrepõem o comportamento implementado.

**Nunca reescrever uma decisão histórica para fabricar prova retroativa.** Documente a mudança, mantenha a autoria e só altere estado oficial quando houver evidência.
