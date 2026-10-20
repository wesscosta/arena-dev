# Estado atual — Arena Dev

**Atualizado em 20/10/2026.** Este é o resumo operacional, não o diário histórico das implementações. Planejamento e decisões de produto vivem no Notion ([Arena Dev — Plataforma de Aprendizagem](https://app.notion.com/p/3bff3eb198c3818fa281fd0abb23b6ce)); este arquivo registra o estado do código.

| Linha | Estado | Fonte de verdade |
| --- | --- | --- |
| `v0.9.0` | Publicada, congelada; Flyway V48 | [`RELEASE_0_9.md`](RELEASE_0_9.md) |
| `v0.10.0` | **Publicada**, Flyway V56, edição self-hosted docente único | [`RELEASE_0_10.md`](RELEASE_0_10.md) |
| `v0.11.0-rc.6` | **Pré-release candidata vigente** (20/10/2026): rc.5 + três bugs de sala da auditoria SOLID (grupos não salvos, trava nas dinâmicas, ordem do palco no celular). **SHA congelado para os 8 gates de campo**; NO-GO para `0.11.0` | [Release notes](RELEASE_0_11.md) |
| `v0.11.0-rc.5` | Substituída pela rc.6 antes dos gates de campo (20/10/2026): robustez de sala | [Release notes](RELEASE_0_11.md) |
| `v0.11.0-rc.4` | Substituída pela rc.5 antes dos gates de campo (20/10/2026): correções da auditoria (foco nos drawers, nome do aluno só ao professor, Postgres em loopback, foco AA no tema claro, Conquistas, ranking) | [Release notes](RELEASE_0_11.md) |
| `v0.11.0-rc.3` | Substituída pela rc.4 antes dos gates de campo (19/10/2026): CSP `connect-src` restrita ao próprio host e varredura axe do aluno e do projetor | [Release notes](RELEASE_0_11.md) |
| `v0.11.0-rc.2` | Substituída pela rc.3 antes dos gates de campo (19/10/2026): `next@16.4.2` (avisos de segurança de 14/10) e otimizador de imagens desligado | [Release notes](RELEASE_0_11.md) |
| `v0.11.0-rc.1` | Substituída pela rc.2 antes dos gates de campo (19/10/2026): v0.11 + ferramental de release + 11.7 (coerência visual, WCAG AA, contraste de texto AAA). | [Release notes](RELEASE_0_11.md) |
| `main` | Candidata `v0.11.0-rc.6` integrada; sem release estável v0.11.0 | [11.7](v0.11/11.7_COHERENCE_AA.md) |
| `v0.12` | **Figma-first**: só auditoria e design; o código parte da baseline `v0.11.0-rc.6` e não recebe mudanças da v0.12 até aprovação explícita do design | [Roadmap v0.12](ROADMAP_V0_12.md) |
| `feat/v012-ramuvi-pro-cards` | Tentativa descartada como implementação (PR [#54](https://github.com/wesscosta/arena-dev/pull/54), draft, não mesclar); preservada para recuperação seletiva | [Decisão 14/10](https://app.notion.com/p/3f9f3eb198c38136b319e5807170f8bf) |
| `feat/v0.10-learning-loop` | Origem histórica da integração v0.10; branch removida após o merge (19/10) | PR [#35](https://github.com/wesscosta/arena-dev/pull/35), incorporada |

**Fechamento (10/10):** o operador autorizou a publicação e declarou aprovados os testes manuais Safari/iOS, DevTools e demais gates; [registro e limites de evidência](v0.10/OPERATOR_ACCEPTANCE_2026-10-10.md). A publicação foi condicionada ao CI do SHA estável, ao backup V56 e ao gate final na `main`.

## Linha de evolução ativa: v0.12 em modo Figma-first

**Decisão de 14/10/2026** ([Notion, auditoria Figma-first](https://app.notion.com/p/3f9f3eb198c38136b319e5807170f8bf)): a v0.12 começa por auditoria e design no Figma. O código parte da candidata `v0.11.0-rc.6`, que já inclui a correção de coerência visual e acessibilidade da 11.7 contra o Design System atual; ela não antecipa a nova linguagem visual da v0.12. Processo: **Figma → revisão UX/UI → protótipo → aceite explícito → código → testes**. Até o aceite, não refatorar JSX/CSS, não criar telas, não alterar tokens no produto e não criar migrations ou APIs da v0.12.

- O PR #54 (`bc49dda`) é tentativa substituída: não mesclar; encerrar só depois de preservar a referência da implementação.
- Requisitos já registrados para o design (não implementados): Jornada do Aluno em **mapa panorâmico e linha do tempo** (14/10) e **D12-JR-CODE-01**, restrições opcionais de cópia em blocos de código da Jornada (16/10). Detalhes no [roadmap v0.12](ROADMAP_V0_12.md).
- Primeiro gate: inventário completo do Figma, hoje bloqueado pelo limite de leitura da integração Figma Starter.

## Linha anterior: v0.11 (pré-release rc.6, NO-GO operacional)

A v0.11 iniciou com a etapa **11.0** (PR #38, integrada), seguida do backend de publicação segura **11.1** (PR #39, integrado, Flyway V57). A interface **11.2** de apresentação docente e leitura pública foi **integrada à `main`** pelo [PR #40](https://github.com/wesscosta/arena-dev/pull/40), após os três jobs aprovados no SHA `ceb60cd` (merge `863c83c`). **Navegação sincronizada por seção 11.3 aprovada e integrada à `main`** pelo [PR #42](https://github.com/wesscosta/arena-dev/pull/42) no SHA `f5526ba`, merge `7ffe27b`. **11.4 integrada à main** pelo PR #45 (merge `1e3645e`, CI 3/3 com WebKit). **11.5 discovery editorial integrado** (PR #46, merge `02da003`), sem nova API/DDL; **11.6 tecnicamente concluída e integrada pelo PR #47** (merge `2c1e011`), incluindo dois projetores, reconexão, WebKit emulado e gate NO-GO; **testes físicos, piloto, rollback e aceite de segurança ainda pendentes**. [Fechamento técnico](v0.11/11.6_TECHNICAL_CLOSURE_NO_GO_2026-10-10.md). Fechamento documental e handoff da v0.12 pelo PR #49 (merge `fc239fe`). Ferramental de release, 11.7 e candidata `v0.11.0-rc.1` pelo [PR #57](https://github.com/wesscosta/arena-dev/pull/57) (merge `796a029`); `rc.2` com a correção de segurança do Next.js; `rc.3` com a CSP restrita ao próprio host; `rc.4` com as correções da auditoria de 19/10; `rc.5` com a robustez de sala e `rc.6` com os bugs de sala da auditoria SOLID (20/10). Consulte [documentação](v0.11/README.md), [execução 11.1](v0.11/11.1_EXECUTION_STATUS.md), [11.2](v0.11/11.2_EXECUTION_STATUS.md), [11.3](v0.11/11.3_EXECUTION_STATUS.md), [11.4](v0.11/11.4_SECURITY_UX_EXECUTION.md), [11.5](v0.11/11.5_EDITORIAL_PROVENANCE_AUDIT.md), [11.6](v0.11/11.6_TECHNICAL_EVIDENCE.md) e [roadmap](ROADMAP_V0_11.md). A v0.10 permanece baseline estável.

## Capacidades efetivamente implementadas na v0.10

- `LearningCycle` e comparação antes/depois **apenas para respostas pareáveis**; não atestar mastery longitudinal com uma medição.
- **XP manual/avulso V56:** `requestId` único no ledger, replay seguro do mesmo comando e 409 para divergência, sem alterar importações antigas. [ADR-0066](adr/ADR-0066-manual-score-creation-idempotency.md). A reconciliação após F5 ainda precisa de conferência do histórico.
- Sorteio com `DrawAttempt` persistido, desfecho explícito (participação, passar, anular), XP opcional e idempotência/reconciliação quando a rede é incerta.
- Peer Instruction, Clínica do Erro, painel de evidências docentes e intervenções contextualizadas.
- Biblioteca canônica reutilizada dentro da Arena, sem cópias e sem exigir embed de Canva.
- Autoconfiança voluntária separada de pontuação/evidência; sugestões de recuperação que dependem da decisão docente.
- PWA com fallback offline seguro e reconexão por snapshot; validação física de upgrade ainda pendente.
- Navegação consolidada: sidebar desktop, drawer único no mobile, Projetar junto ao hambúrguer, Material da aula, Roteiro e Evidências sem duplicar atalhos. Timer com rolagem vertical integral e scrollbar invisível; renderização semântica e segura de `<aside>` exportado do Notion.

**Não incluir como capacidades estáveis:** Mastery v1, SaaS multi-docente isolado, RAG/LLM de domínio, embed Canva em iframe, comprovação de aprendizagem longitudinal, ou qualquer funcionalidade experimental sem piloto.

## Evidências disponíveis e o que elas não demonstram

- CI do SHA `d876325` ([run #38019345190](https://github.com/wesscosta/arena-dev/actions/runs/38019345190)) terminou **cancelado**, não aprovado. O CI vigente da candidata é o da `main` em `796a029` ([run #39199028144](https://github.com/wesscosta/arena-dev/actions/runs/39199028144), `success`). Qualquer commit de documentação gera novo SHA e exige novo CI.
- Em 10/10, os testes locais mais recentes do frontend tiveram **319/319 unitários**, TypeScript, build, lint sem erros e 2/2 E2E direcionados de rolagem. Não equivalem à regressão integrada completa (backend + frontend + projeto) no SHA final.
- Build/health de desenvolvimento são verificações técnicas, **não** autorização de lançamento.
- **Rollback técnico isolado V48→V56→V48 aprovado em 10/10 (exit 0):** [evidência](v0.10/ROLLBACK_V56_SYNTHETIC_2026-10-10.md), dados sintéticos e sem alteração do banco principal; RTO/RPO operacional segue pendente.
- **Declaração do operador em 10/10:** experiência em Safari/iOS concluída e validada. Não foram informados versão de iOS, aparelhos, instalação prévia de PWA v0.9, execução de upgrade, checklist assistivo nem logs. Registrar como aceite visual/funcional relatado, **não** como prova dos demais gates.

## Bloqueadores de homologação

1. Upgrade de PWA v0.9 instalada em Android/Chrome e iOS/Safari reais.
2. Rede degradada real, respostas HTTP incertas, professor/aluno/projetor concorrentes.
3. Leitor de tela, teclado, foco, contraste, zoom 200–400% e acessibilidade manual.
4. Piloto docente com turma real, com evidência pedagógica e feedback.
5. Backup/restore e rollback operacional com RTO/RPO aceitos, segurança e aprovação do PR.

**Decisão: GO restrito self-hosted / operador único para `v0.10.0`, sujeito à evidência técnica de tag e gate final.** [Aceite operacional](v0.10/OPERATIONAL_ACCEPTANCE.md), [matriz de testes](v0.10/TEST_MATRIX.md) e [auditoria de consolidação](v0.10/AUDITORIA_CONSOLIDACAO_2026-10-09.md).

## Onde encontrar detalhes sem duplicar o README

- [Roadmap e limites](ROADMAP_V0_10.md) · [Plano técnico](v0.10/IMPLEMENTATION_PLAN.md)
- [Diário de implementação](v0.10/EXECUTION_STATUS.md) · [Contratos de API](v0.10/API_CONTRACTS.md)
- [Arquitetura e decisões](adr/README.md) · [UX e desenho das dinâmicas](ux/arena-dynamics-visual-system-v010.md)
- [Índice documental e versões anteriores](DOCUMENTATION_INDEX.md)

Os documentos dos incrementos 14.x/16.x permanecem acessíveis no Git e no índice, mas não determinam o estado de release da v0.10.
