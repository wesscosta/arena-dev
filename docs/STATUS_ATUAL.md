# Estado atual — Arena Dev

**Atualizado em 10/10/2026.** Este é o resumo operacional, não o diário histórico das implementações.

| Linha | Estado | Fonte de verdade |
| --- | --- | --- |
| `v0.9.0` | Publicada, congelada; Flyway V48 | [`RELEASE_0_9.md`](RELEASE_0_9.md) |
| `v0.10.0-rc.1` | Candidata em homologação; **NO-GO para release estável**; Flyway V56 | [`v0.10/RELEASE_CANDIDATE_CHECKLIST.md`](v0.10/RELEASE_CANDIDATE_CHECKLIST.md) |
| `main` | Branch de publicação da baseline | Tag v0.9.0 e GitHub Release |
| `feat/v0.10-learning-loop` | Branch da candidata, publicada no remoto até `d876325` antes da atualização documental | PR [#35](https://github.com/wesscosta/arena-dev/pull/35), em rascunho |

## Capacidades efetivamente implementadas na candidata v0.10

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

- CI remoto do SHA `d876325`: [run #38019345190](https://github.com/wesscosta/arena-dev/actions/runs/38019345190), **em execução no momento da revisão documental**; não considerá-lo aprovado sem conclusão `success`. Qualquer commit de documentação gera novo SHA e exige novo CI.
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

**Decisão atual: NO-GO para `v0.10.0` estável.** [Aceite operacional](v0.10/OPERATIONAL_ACCEPTANCE.md), [matriz de testes](v0.10/TEST_MATRIX.md) e [auditoria de consolidação](v0.10/AUDITORIA_CONSOLIDACAO_2026-10-09.md).

## Onde encontrar detalhes sem duplicar o README

- [Roadmap e limites](ROADMAP_V0_10.md) · [Plano técnico](v0.10/IMPLEMENTATION_PLAN.md)
- [Diário de implementação](v0.10/EXECUTION_STATUS.md) · [Contratos de API](v0.10/API_CONTRACTS.md)
- [Arquitetura e decisões](adr/README.md) · [UX e desenho das dinâmicas](ux/arena-dynamics-visual-system-v010.md)
- [Índice documental e versões anteriores](DOCUMENTATION_INDEX.md)

Os documentos dos incrementos 14.x/16.x permanecem acessíveis no Git e no índice, mas não determinam o estado de release da v0.10.
