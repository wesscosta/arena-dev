# ADR-0066 — Idempotência de criação de XP manual (v0.10)

**Estado:** implementado na candidata (09/10/2026), pendente de CI no SHA definitivo e homologação de rede real.

## Problema

O comando `POST /api/score-events` criava um evento para cada solicitação. Uma resposta HTTP perdida após commit, dois cliques ou concorrência poderia provocar XP duplicado. A reversão V53 e o `DrawAttempt` V50 são idempotentes, mas **não** protegem esse endpoint.

## Decisão

- Migration **V56**, exclusivamente aditiva: `score_events.create_request_id uuid` nullable, índice único parcial e constraint que proíbe esse campo em reversões. Clientes antigos e lotes permanecem compatíveis; não reescrever V3 ou V53.
- Aceitar `requestId?: UUID` em `POST /api/score-events` para comandos de criação unitária. O cliente v0.10 **sempre** envia UUID para XP manual e Buzzer. Não aplicar retroativamente a Quiz, Draw ou importação com regras próprias.
- Serviço transacional PostgreSQL: lock advisory por hash de UUID para serializar duas tentativas com a mesma chave, lookup existente e validação **exata** de turma, aluno, sessão, pontos, categoria, descrição normalizada, fonte e referências. Mesmo comando retorna mesmo `ScoreEvent.id`; payload diferente responde HTTP **409**. Índice único permanece segunda barreira. A transação preserva a publicação de ranking apenas no primeiro commit.
- O browser impede cliques concorrentes, mantém a mesma chave **enquanto o comando permanecer incerto na memória** e não faz retry automático. Se houve erro de rede, o professor pode repetir o mesmo comando de forma segura; um comando diferente fica temporariamente bloqueado, exigindo reconciliação. Reload entre tentativa e resposta ainda exige conferência do histórico e não equivale a reconciliação automática.
- Campo de XP manual rejeita zero e números não inteiros. O ledger local deduplica por `ScoreEvent.id` caso o servidor devolva o mesmo registro.

## Alternativas rejeitadas

- Deduplicar por aluno/valor/tempo: impediria lançamentos legítimos iguais.
- Reutilizar `reversal_request_id` ou ID do sorteio: mistura contratos independentes e invalida constraints de reversão.
- Cache em memória de requests: desaparece em reinício do servidor, não funciona em concorrência ou múltiplas instâncias.
- `ON CONFLICT DO NOTHING` sem comparar payload: permitiria reutilização silenciosa de chave com dados distintos.

## Validação

- `ManualScoreIdempotencyIT`: retry igual, payload divergente, concorrência real e compatibilidade de clientes antigos usando PostgreSQL 17/Testcontainers.
- Playwright E2E: replay idêntico, HTTP 409 divergente e somatório do ledger; combinado aos fluxos de Sorteio e XP reversível.
- Migração/rollback e `verify-v0.10-contract` precisam exigir V56; gate final da release mantém NO-GO sem dispositivos reais, acessibilidade e piloto.

## Limitações residuais

Uma aba recarregada perde a referência volátil da chave ainda não confirmada; a UI orienta conferir o ledger em vez de alegar recuperação perfeita entre recargas. Não afirmar garantia universal para consumidores antigos sem `requestId`. Idempotência protege reenvio **do mesmo comando** — não impede o professor de criar novos comandos com outros UUIDs intencionalmente.
