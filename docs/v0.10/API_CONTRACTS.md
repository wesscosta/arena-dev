> **Estado de implementação em 08/10/2026:** contratos V49–V51 de `LearningCycle`, sorteio V50 e interface de intervenção P1-A existem na branch de desenvolvimento. Partes desta especificação continuam propostas futuras; para estado verificável, consultar [EXECUTION_STATUS.md](EXECUTION_STATUS.md).

# Arena Dev v0.10 — Contratos, Persistência e Estados (proposta)

**Referência:** [Plano de implementação](IMPLEMENTATION_PLAN.md). Este documento é especificação de API/DDL para PRs futuros. Os endpoints V49 existentes estão indicados; os demais **ainda não existem**. Campos/nomes apresentados são proposta e devem ser ratificados por testes de contrato antes de implementação.

## 1. Contratos existentes a preservar

| Endpoint existente | Papel atual | Compatibilidade da v0.10 |
|---|---|---|
| `GET /api/sessions/{sessionId}/learning-checks/current` | Estado da verificação atual | Manter |
| `POST /api/sessions/{sessionId}/learning-checks/{runId}/repeat` | Novo `InteractionRun` da mesma definição | Reutilizar; ciclo vincula followup sem modificar resposta anterior |
| `GET/POST /api/sessions/{sessionId}/learning-cycles` | V49: lista/cria ciclo | Endurecer permissão e conclusão da avaliação |
| `POST /api/sessions/{sessionId}/learning-cycles/{cycleId}/intervention` | V49: nota de intervenção | Versionar ou auditar edições, tipo de intervenção opcional |
| `POST /api/sessions/{sessionId}/learning-cycles/{cycleId}/verification` | V49: aponta followup | Verificar finalização, invariantes e concorrência |
| `POST /api/sessions/{sessionId}/mechanics/draw` | Sorteia e incrementa `drawCounts` imediatamente | Adapter legado isolado, não quebrar clientes antigos sem gate |
| `PUT /api/sessions/{sessionId}/mechanics/draw/presentation` | `GRID_SPOTLIGHT` ou `WHEEL` | Manter API/enum, critério separado |
| `GET /api/sessions/{sessionId}/mechanics/arena/flow` | Roteiro autoritativo | Não gerar avanço implícito |
| `POST /api/sessions/{sessionId}/mechanics/arena/flow/next` | Avanço explícito do roteiro | Manter |

**Política de lançamento:** commands da nova seleção usam `/draw-attempts`, não substituem silenciosamente `/mechanics/draw`. A compatibilidade legado mantém *semântica histórica* até migration gate; novo frontend v0.10 chama apenas novo fluxo quando flag ativada. Não intercalar legado e novo sem regra de reconciliação: durante flag nova, bloquear endpoint antigo para a mesma sessão ou rotear explicitamente para novo protocolo com cliente compatível. Mitigar dependência de versões móveis/cache PWA.

## 2. Máquina de estado do sorteio v0.10

```text
                  SELECT (requestId único)
                           │
                           ▼
                        PENDING
                    /       |       \
                   /        |        \
         CONFIRMED       PASSED      VOIDED
        (+ ScoreEvent     sem XP      sem consumir
           opcional)                   rodada

   Só uma tentativa PENDING por sessão em qualquer instante.
   Estados terminais são imutáveis: retry idempotente ou 409.
```

**Ciclo de rodada completa:** ao iniciar, computar conjunto elegível `presentStudentIds - calledConfirmedOrPassedInRound`. Se vazio e havia pelo menos um presente, solicitar `start-next-round` e mudar `roundNumber`; apenas um presente pode ser mostrado como exceção explícita. Uma tentativa `VOIDED` retorna elegibilidade à rodada. Seleção `PENDING` reserva nome até confirmação. Mudanças de presença não reescrevem a lista já chamada; se um participante regressa à presença e não foi chamado na rodada, retorna à lista elegível. Número da rodada e `drawPolicy` são guardados no servidor, não no browser.

### 2.1 Esquema de banco V50 (DDL conceitual)

```sql
create table draw_session_settings (
    session_id uuid primary key references class_sessions(id) on delete cascade,
    selection_policy varchar(32) not null default 'ROUND_ROBIN_SHUFFLED',
    round_number integer not null default 1,
    revision bigint not null default 0,
    updated_at timestamptz not null default now(),
    constraint ck_draw_settings_policy check
      (selection_policy in ('ROUND_ROBIN_SHUFFLED','BALANCED_WEIGHTED')),
    constraint ck_draw_settings_round check (round_number >= 1)
);
create table draw_attempts (
    id uuid primary key,
    session_id uuid not null references class_sessions(id) on delete cascade,
    student_id uuid not null references students(id) on delete restrict,
    sequence integer not null,
    round_number integer not null,
    selection_policy varchar(32) not null,
    status varchar(16) not null default 'PENDING',
    select_request_id uuid not null,
    resolution_request_id uuid,
    selected_at timestamptz not null default now(),
    resolved_at timestamptz,
    resolved_by uuid,
    updated_at timestamptz not null default now(),
    constraint uk_draw_attempt_session_seq unique(session_id, sequence),
    constraint uk_draw_attempt_select_request unique(session_id, select_request_id),
    constraint uk_draw_attempt_resolve_request unique(session_id, resolution_request_id),
    constraint ck_draw_attempt_status check(status in ('PENDING','CONFIRMED','PASSED','VOIDED')),
    constraint ck_draw_attempt_status_time check(
      (status='PENDING' and resolved_at is null)
      or (status<>'PENDING' and resolved_at is not null)),
    constraint ck_draw_attempt_positive check(sequence>=1 and round_number>=1)
);
create unique index uk_draw_attempt_one_pending
  on draw_attempts(session_id) where status='PENDING';
create index idx_draw_attempt_round
  on draw_attempts(session_id, round_number, status, student_id);
create table draw_attempt_score_links (
    draw_attempt_id uuid primary key references draw_attempts(id) on delete restrict,
    score_event_id uuid not null unique references score_events(id) on delete restrict
);
```

*Antes do DDL definitivo:* confirmar nomes reais das tabelas de estudantes e identidade de professor; `resolved_by` deve referenciar FK real ou ser auditável por sessão. Melhor usar FK de `session_participants` associada à sessão se constraints compostas forem viáveis. **Nunca colar DDL conceitual sem revisar a migração existente**.

**Garantias que aplicação deve verificar além das FKs:** estudante pertence à turma e à sessão, presença no instante da seleção; política da tentativa é snapshot imutável; a ação de resolver pertence ao mesmo professor autorizado; o score vinculado pertence ao mesmo estudante/turma/sessão; os valores do comando não anulam contagens passadas. Para proteção forte, evoluir FKs compostas ou usar lock de sessão + validação de ownership.

### 2.2 Seleção e desfecho — endpoints novos

| Verbo e caminho | Corpo | Retorno | Invariantes |
|---|---|---|---|
| `GET /api/sessions/{sessionId}/draw-attempts/state` | — | `DrawStateView` | Escopo docente e snapshot versionado |
| `PUT /api/sessions/{sessionId}/draw-attempts/policy` | `{ "policy": "ROUND_ROBIN_SHUFFLED" }` | `DrawStateView` | Sem tentativa PENDING; mudança declarada da próxima rodada; não apagar histórico |
| `POST /api/sessions/{sessionId}/draw-attempts` | `{ "requestId": "UUID" }` | `201 DrawAttemptView` | Lock da sessão; uma PENDING; escolha no backend; mesma request idempotente |
| `POST /api/sessions/{sessionId}/draw-attempts/{id}/resolve` | `{ "requestId": "UUID", "outcome": "CONFIRMED\|PASSED\|VOIDED", "score": null }` | `200 DrawAttemptView` | Idempotente; estado terminal; bloquear XP sem confirmed |
| `POST /api/sessions/{sessionId}/draw-attempts/{id}/resolve` | `{ "requestId": "UUID", "outcome": "CONFIRMED", "score": {"points": 5,"category":"COLLABORATION","reason":"Participação"} }` | `200 DrawAttemptView` | Único ScoreEvent + link por attempt, mesmo commit |
| `POST /api/sessions/{sessionId}/draw-attempts/next-round` | `{ "requestId": "UUID" }` | `200 DrawStateView` | Somente sem PENDING e após fechamento da rodada; idempotente |

**Resposta exemplo**:

```json
{
  "attemptId": "4c12fbb2-b7bb-4c10-b985-132690d3f5fd",
  "sessionId": "a1fc90bd-71b7-416d-a779-252d2572d117",
  "studentId": "a9a05ae9-f71c-4dc8-ab40-36092f7a242c",
  "policy": "ROUND_ROBIN_SHUFFLED",
  "roundNumber": 1,
  "sequence": 3,
  "status": "PENDING",
  "scoreEventId": null,
  "revision": 5
}
```

`DrawStateView` deve conter `policy`, `selectorPresentation`, `currentRound`, `currentAttempt?`, `calledUniqueCount`, `confirmedCount`, `passedCount`, `voidedCount`, `eligibleCount`, `eligibleCurrentRoundCount`, `canStartNextRound`, `revision` e histórico compacto. Para aluno e projetor usar **DTO pública reduzida**, sem pontuação privada nem rótulo de participação recusada.

**Códigos de erro:** `400` corpo malformado; `401` não autenticado; `403` professor sem escopo; `404` ID invisível/externo à sessão; `409` pending existente, resolução divergente ou mudança de política durante tentativa; `422` sem elegíveis/estado inválido. Padrão de erros existente deve ser reaproveitado (não trocar JSON global sem migração). `requestId` repetido com mesmo payload devolve o mesmo resultado sem novo evento; payload divergente retorna `409`. Handler não depende de timing do frontend.

### 2.3 Transação e realtime

```text
POST /draw-attempts(requestId)
  → resolve TeacherSessionAccess
  → ClassSessionRepository.findByIdForUpdate
  → load DrawSessionSettings + current PENDING
  → check requestId and policy/eligible pool
  → ParticipantSelectionService.select(policy, state, RNG)
  → INSERT draw_attempt PENDING
  → advance revision; record SessionEvent
  → COMMIT
  → publish snapshot/event afterCommit (projector/student safe)

POST /draw-attempts/{id}/resolve(requestId, outcome, score?)
  → access/lock session + attempt
  → if retry same requestId + result: return cached fact
  → validate terminal transition and student enrollment
  → update attempt outcome + optionally ScoreEvent + draw_attempt_score_links
  → revision and session event
  → COMMIT
  → publish afterCommit
```

**Concorrência:** lock transacional em `ClassSession` e unique index de pending; para next-round também persistir `next_round_request_id` ou ledger de comandos, pois tentar calcular idempotência só pelo número atual não basta. Testar dois controllers simultâneos em Postgres. O publish atual de score/ranking precisa ser revisado para ser after-commit; não reportar XP no WebSocket antes da confirmação da transação. Retentativas em 409 por colisão não devem criar segunda seleção.

## 3. LearningCycle — contratos V49 + endurecimento P0

`LearningCycleController` já existe com:

```http
POST /api/sessions/{sessionId}/learning-cycles
Content-Type: application/json

{"baselineRunId":"<UUID>"}

POST /api/sessions/{sessionId}/learning-cycles/{cycleId}/intervention
{"note":"Discussão de alternativas e explicação de WHERE."}

POST /api/sessions/{sessionId}/learning-cycles/{cycleId}/verification
{"followupRunId":"<UUID>"}

GET /api/sessions/{sessionId}/learning-cycles
```

**Alvos para o PR P0-A:**

1. Adicionar policy de professor/turma/sessão e validação de UUIDs referenciados, sem vazamento cross-session.
2. Diagnóstico só aceita baseline de sessão certa com interação encerrada, avaliações finalizadas e evidências persistidas; não ler estatística de resposta incompleta como resultado.
3. Intervention deve registrar autor, instante, tipo opcional e histórico se notas forem editadas (V49 não tem autor/revisões).
4. Verification valida estado da nova execução e mesma definição/alvo/sessão; transição não duplica `InteractionRun` e não deixa followup reutilizado em ciclos concorrentes.
5. `GET /learning-cycles/{cycleId}/comparison` (proposto) entrega dados agregados e transições de pares válidos, com n iniciais, n finais, n pareados e n excluídos; professor pode ver acompanhamento individual autorizado, projetor recebe somente agregados.
6. `POST /learning-cycles/{cycleId}/repeat` (proposto opcional) delega ao `LearningCheckService.repeat` e retorna run criado, não marca VERIFIED até encerramento/avaliação; não duplicar definição.
7. Se baseline ou followup foi `CLOSED` mas não possui avaliação verificável, `422`: aguardar/reconciliar avaliação; nunca marcar mastery pela simples transição.

**Contrato comparação v1**:

```json
{
  "cycleId":"<UUID>",
  "objectiveId":"<UUID>",
  "baseline":{"runId":"<UUID>","answered":17,"evaluated":17,"correct":8},
  "followup":{"runId":"<UUID>","answered":15,"evaluated":15,"correct":12},
  "matched":13,
  "transitions":{"incorrectToCorrect":5,"correctToCorrect":6,"correctToIncorrect":1,"incorrectToIncorrect":1},
  "notComparable":{"baselineOnly":4,"followupOnly":2,"notEvaluated":0},
  "disclaimer":"Variação imediata neste instrumento; não equivale a domínio consolidado."
}
```

Os números acima são **dados fictícios somente para descrever o payload**; em implementação, as transições devem satisfazer `sum(transitions) == matched` e subconjunto dos counts originais. Não arredondar percentuais prematuramente, nem reidentificar alunos não pareados. Para `PARTIAL`/`NOT_EVALUATED`, tratar como `notComparable` com razão explícita na primeira versão binária. Recorte por objetivo é associado a `learning_target_id` e revisão da questão, sem inventar taxonomia de concursos.

## 4. Contexto da Arena e recurso externo (proposto)

**Primeiro preferir composição local de queries já existentes** (`GET /mechanics/arena/flow`, LearningCheckState, LiveStage, Biblioteca) em um `ArenaContextView` frontend, evitando materializar duplicata. Se houver necessidade real de restore/realtime forte, adotar read API agregada `GET /api/sessions/{sessionId}/teaching-context` com:

```json
{
  "sessionId":"<UUID>",
  "liveStage":{"type":"POLL","referenceId":"<UUID>"},
  "runbook":{"activityId":null,"stepId":null},
  "currentObjectiveId":null,
  "currentMaterialId":null,
  "availableActions":["DISCUSS_RESULT","ORGANIZE_PAIRS","RECHECK","RETURN_TO_RUNBOOK"],
  "revision":14
}
```

`availableActions` é **projeção** baseada em estado/autorizações, não engine autônoma. `POST /teaching-context/activate-resource` só se não for possível reutilizar `LiveStage` ou o placement do roteiro; deve validar `resourceId`, visibilidade, classroom e direitos de publicação. Não criar `ActivityStepType.HTML` na v0.10 nem converter `LINK` em upload bruto.

**Material externo:** URL final HTTPS validada na criação/preview, bloquear `javascript:`/`data:`/credenciais embutidas e redirect para host privado se backend buscar recursos. No MVP, frontend mostra URL canonical, título, origem e CTA de abrir em aba com `noopener noreferrer`; reentrada pela Arena mantém contexto local. Em P2, iframe permitido apenas por provider policy e host CSP/sandbox, com botão de fallback a qualquer momento. Não capturar/postar cookies ou resultados de alunos.

## 5. LearnerConfidence (P1, somente após gate)

`POST /api/join/sessions/{sessionId}/learning-checks/{runId}/confidence` (forma **proposta**, verificar rotas e autenticação real do join antes de fixá-la), corpo `{ "level":"LOW|MEDIUM|HIGH|SKIPPED" }`. Identificar estudante pela sessão autenticada/token de participante, **jamais aceitar `studentId` arbitrário do cliente**. Uma única resposta por participante/run, upsert idempotente; não incluir confidence em score/mastery. Medir somente distribuição agregada no painel docente e oferecer não responder.

### Contrato implementado P1-D — V55 (08/10/2026)

A implementação segue as rotas **reais** do join: `POST /api/join/{code}/learning-check/{runId}/confidence` com `{ "token":"...", "level":"LOW|MEDIUM|HIGH|SKIPPED" }`, e GET equivalente com `?token=...` para recuperar apenas a própria percepção. O professor consulta somente `GET /api/sessions/{sessionId}/learning-checks/{runId}/confidence-summary`. A distribuição exige verificação bloqueada e ao menos três declarações; caso contrário retorna `{ "available":false,"declarations":0,"counts":{},"reason":"..." }`. A declaração exige uma resposta individual real já registrada e run aberto, é idempotente e pode ser corrigida até o lock; código/token autenticam a identidade. `LearningCheckParticipantState.selfConfidence` é apenas do próprio aluno (ou null). Nenhum dos contratos expõe nomes, matrículas, outros alunos ou modifica avaliação/XP. Ver [ADR-0060](../adr/ADR-0060-student-self-confidence-and-evidence-based-recovery.md).

## 6. Feature flags e evolução de API

- `learningLoopEnabled` ativa UI nova só após 10.1 passar integração, não altera baseline V49.
- `drawOutcomeEnabled` seleciona frontend e backend novos; não misturar comandos antigos na mesma sessão quando ativo. `drawLegacyEnabled` pode ser desligado por sessão sem apagar `drawCounts`.
- `contextualNextActionsEnabled` é UI affordance, não um comando de fluxo obrigatório.
- `externalPlacementEnabled` liga reuso contextual de LINK sem iframe.
- `externalEmbedPilotEnabled` **off por padrão** e fora do P0; kill switch imediato.

**Contrato de eventos realtime:** envelope único por módulo (`sessionId`,`revision`,`eventId`,`eventType`,`publicStage`,`serverTime`) na evolução, com GET snapshot por versão. Não substituir abruptamente todos os tópicos WebSocket atuais; criar adapter e eliminar duplicações só após telemetria.

## Contrato implementado P1-A — Peer Instruction (Flyway V51)

`POST /api/sessions/{sessionId}/learning-cycles/{cycleId}/intervention`

```json
{"note":"Debate em pares sem revelar gabarito", "type":"PEER_DISCUSSION"}
```

- `type` aceita `EXPLANATION` (padrão de retrocompatibilidade) e `PEER_DISCUSSION`.
- O servidor rejeita `PEER_DISCUSSION` caso a primeira verificação tenha revelado a resposta ou conte com menos de duas respostas individuais persistidas. A questão de origem deve estar avaliada e fechada; outra `InteractionRun` posterior é ligada à verificação do ciclo.
- `CycleView` inclui `interventionType` (null até registrar), `baselineResultsRevealed` e `baselineResponseCount`. Esses campos são do professor; aluno/projetor não obtêm opções individuais de terceiros.
- SQL V51 altera **somente** `learning_intervention_cycles.intervention_type` e faz backfill de ciclos intervenidos existentes com `EXPLANATION`, sem criar tabelas de questionário paralelas.
- **Não representa** mastery, prova de participação em grupos nem certificado. Critérios pedagógicos em [ADR-0054](../adr/ADR-0054-peer-instruction-through-learning-cycle.md).

## Contrato implementado P1-B — Clínica do Erro (Flyway V52)

`GET /api/sessions/{sessionId}/learning-checks/{runId}/error-clinic` → vista docente com `runId`, `responseCount`, `options` (`key`, `label`, `count`, `incorrect`), histórico de notas (sem PII) e disclaimer. Somente para `InteractionRun` da mesma sessão **CLOSED**, de múltipla escolha com gabarito e evidências completas.

`POST /api/sessions/{sessionId}/learning-checks/{runId}/error-clinic/notes`:

```json
{"commandId":"5ae34017-e329-4c84-a949-ea0c2434fb14", "optionKey":"a", "note":"Revisar a diferença entre filtragem e ordenação com dois exemplos."}
```

Aceita somente alternativa **incorreta e com votos reais**. Até 1200 caracteres, append-only; reenvio idêntico do `commandId` retorna mesma vista, alteração da mesma chave é `409`. Exige autenticação docente e CSRF; registro no `SessionEvent` guarda run/alternativa, não copia a nota. **Não** altera a resposta original, XP, `LearningEvidence`, a correção nem o palco. Documentação de decisão: [ADR-0055](../adr/ADR-0055-error-clinic-teacher-annotations.md).
