# ADR-0051 — Critério de sorteio e desfecho de participação são domínios distintos

**Estado:** Aceito para planejamento da v0.10 — 08/10/2026. **Implementação:** pendente.

## Problema

A v0.9 incrementa `drawCounts` no sorteio, sem confirmação de participação. O balanceamento ponderado exclui o último participante, mas permite repetição antes da cobertura total. Grid e Roleta têm ações de confirmação distintas. A pontuação manual é independente do evento de seleção.

## Decisão

Separar `DrawPolicy` (`BALANCED_WEIGHTED` e `ROUND_ROBIN_SHUFFLED`) de `ParticipantSelectorPresentation` (`GRID_SPOTLIGHT` e `WHEEL`). Padrão proposto para novas sessões: rodada completa sem reposição, a ser confirmado em testes de regressão/usabilidade. Persistir um `DrawAttempt` com `PENDING`, `CONFIRMED`, `PASSED` ou `VOIDED` e eventos auditáveis. Não permitir novo sorteio enquanto o anterior estiver pendente, salvo ação explícita de anular. Atribuir XP apenas por ação docente explícita e idempotente vinculada ao attempt. Não converter sorteios antigos em participação confirmada.

`PASS` conta como pessoa chamada, não como participação. `VOID` é erro/cancelamento operacional e não conta como chamada. Uma presença modificada reavalia somente elegibilidade futura, preservando história. Caso a turma tenha apenas um presente, informar que a repetição é inevitável.

## Consequências e riscos

Mudança transversal em backend `MechanicsService`/session state/score ledger, Frontend Grid e Roleta, relatório, realtime, logs e E2E. Exige migração aditiva e tratamento de comandos concorrentes/retry. Não confundir seleção com avaliação de aprendizagem. Evitar constrangimento público pela nomenclatura de quem passou a vez.
