# ADR-0057 — Reversão de XP idempotente sem apagar participação

**Data:** 08/10/2026 · **Estado:** aceita e implementada na branch v0.10 · **Escopo:** P0-H — ledger e reversões auditáveis.

## Problema e decisão

A tabela `score_events` é um ledger imutável: uma correção deve acrescentar uma entrada negativa, jamais excluir a atribuição original ou reescrever `DrawAttempt`. A migração V3 já possuía índice único de `reversal_of`, impedindo duas reversões distintas, mas o fluxo legado consultava `existsByReversalOfId` sem serializar requisições concorrentes. Uma disputa poderia produzir um erro de integridade em vez de resposta idempotente/HTTP 409. Ainda não existia uma chave de comando durável para reenvios sob rede instável.

## Solução

- **Flyway V53 aditiva:** `score_events.reversal_request_id uuid` opcional; índice único parcial e `CHECK` que proíbe chave de reversão em um lançamento não reversor. Os eventos legados permanecem intactos. O índice único já existente em `reversal_of` continua como proteção final.
- `ScoreEventService.reverse(originalId, requestId)` aplica **`PESSIMISTIC_WRITE` na linha de score original**, verifica a reversão vinculada, retorna **o mesmo evento** se for o mesmo `requestId`, ou produz **409 Conflict** se uma chave distinta tenta corrigir o mesmo original. Comandos sem corpo continuam usando o contrato legado e rejeitam duplicação como antes. O endpoint conserva `POST /api/score-events/{id}/reverse` e a exigência de autenticação/CSRF.
- `ScoreEvent.createdAt` usa precisão de microssegundos, compatível com PostgreSQL, de modo que o mesmo comando devolva **JSON idêntico** antes/depois do roundtrip de banco.
- A correção registra um único `SessionEvent` `SCORE_EVENT_REVERSED` para eventos de sessão, com IDs e magnitude reversa, sem texto do aluno. O ranking é invalidado pelo mecanismo de publicação existente, após a transação, sem duplicar XP.
- A projeção `DrawAttemptView.scoreReversed` expõe a reversão do **XP vinculado**, mantendo `DrawOutcome.CONFIRMED`. Participação confirmada e score concedido são fatos diferentes; reverter pontuação não reabre nem anula sorteio e não torna o aluno novamente elegível na rodada.
- Frontend envia `requestId` UUID nos novos comandos. O cliente antigo pode continuar chamando o endpoint sem corpo durante rollout de compatibilidade; **não** existe alteração da licença ou de dados de conta.

## Gates executáveis

- PostgreSQL 17/Testcontainers: 2 threads simultâneas com **mesmo** `requestId` retornam o mesmo registro, **uma** trilha de sessão, 0 XP líquido; comando distinto resulta em conflito, sem segundo evento. O cenário cobre ainda reversão de reversão proibida, índice persistido, vínculo ScoreEvent–DrawAttempt, status confirmado preservado.
- HTTP: autenticação/CSRF, payload inválido, replay JSON idêntico (microssegundos) e resposta 409 para comando diferente. `SecurityAndMigrationIT` verifica Flyway V1–V53.
- Playwright: confirmação com XP → correção → replay → conflito → reentrada na Arena após F5 → participação intacta e reversão detectada.

## Limitações e riscos

- A chave `requestId` é gerada por ação no cliente. Repetir manualmente uma ação após perder a resposta pode gerar **novo UUID** e resultar em HTTP 409, sem duplicar XP. Uma camada futura pode reter o token de ação em fila/retry durável para apresentar confirmação amigável mesmo após interrupções longas.
- Eventos de score sem sessão não geram `SessionEvent`, mas continuam auditáveis no próprio ledger, com autor lógico limitado à conta docente por instalação (ADR-0053). Multi-docente exige identidade/autoria reais.
- Este gate é distinto de homologação de PWA, cache de versões antigas, simulação WAN sob carga e auditoria manual de WCAG. Não declarar release apenas com estes testes.
