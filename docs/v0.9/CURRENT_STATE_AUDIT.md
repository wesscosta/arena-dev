# v0.9 — Current State Audit

**Data:** 2026-10-07  
**Estado:** baseline v0.9.0 publicada/congelada
**Branch final:** `main`
**Origem da implementação:** `feat/v0.9-learning-core-foundation` + `feat/v0.9-release-gate-hardening`

## Baseline validada

Antes das alterações funcionais:

- backend: 117 testes unitários verdes;
- frontend: 288 testes verdes;
- working tree limpo;
- Flyway existente até V38.

## Arena runtime atual

### Sessão e realtime

- backend continua autoritativo;
- `useArenaRealtime` agrega Join Code, Buzzer, Timer, Word Cloud, Poll, Quiz, **Learning Check** e Ranking;
- respostas de Quiz usam REST e estado é projetado por realtime;
- Projector consome runtime compartilhado;
- reconnect já possui testes específicos.

### Quiz

Persistência atual:

```text
QuizRound
  └── question_id → ActivityQuestion
  └── ParticipantAnswer
        ├── answer_json
        ├── evaluated_at
        ├── is_correct
        └── score_event_id
```

O runtime já separa parcialmente resposta bruta e avaliação, mas a avaliação está armazenada na própria tabela de resposta.

O Quiz referencia `ActivityQuestion`, portanto o novo Interaction Core deve usar adapter em vez de transformar ActivityQuestion em sua entidade canônica.

### Poll

Possui runtime próprio:

- poll_rounds;
- poll_options;
- poll_votes.

É candidato direto a CHOICE + `evaluationMode = NONE` após o Quiz validar o novo core.

### Word Cloud

Possui runtime próprio e será candidata a:

```text
responseKind = TEXT
presentationMode = WORD_CLOUD
```

após o primeiro slice vertical.

## Biblioteca semântica existente

A V38 já adicionou:

- subject;
- language;
- tags;
- content_sha256;
- outline_json;
- outline_parser_version.

A própria migration define subject como metadata editorial flexível, **não** como KnowledgeNode/taxonomia.

Conclusão:

> LearningTarget deve ser um novo conceito pedagógico e não reutilizar subject/tags como fonte de verdade.

A Biblioteca também já possui:

- revision;
- source_reference;
- source_snapshot_at;
- source_content_sha256.

ContentRef e Provenance da v0.9 devem aproveitar esses identificadores sem duplicar internals da Biblioteca.

## Decisões da auditoria

1. criar pacote `learning` como fundação semântica transversal;
2. introduzir `LearningTarget` por migration V39;
3. não criar Knowledge Graph;
4. manter ContentRef e Provenance como value contracts inicialmente;
5. não alterar Quiz/Poll/Nuvem neste primeiro commit;
6. criar Interaction somente depois desta foundation passar testes;
7. manter migrations aditivas;
8. não alterar scripts específicos de verificação da release v0.8, mesmo que a branch v0.9 avance além de V38;
9. atualizar apenas testes genéricos que validam a versão Flyway corrente.

## Estado atual após o primeiro slice vertical

A fundação prevista acima já avançou de V39 até **V48**:

```text
V39 LearningTarget / ContentRef / Provenance
→ V40 InteractionDefinition
→ V41 InteractionRun
→ V42 Response
→ V43 Evaluation
→ V44 Quiz shadow adapter/validation
→ V45 LearningEvidence
→ V46 Poll shadow adapter/validation
→ V47 Word Cloud shadow adapter/validation
→ V48 observações duráveis + gate final AI-ready/cutover
```

O primeiro fluxo nativo **Verificar aprendizagem** está implementado ponta a ponta:

```text
LearningTarget
→ InteractionDefinition
→ InteractionRun
→ Response
→ Evaluation
→ Result
→ LearningEvidence
```

Estado funcional confirmado:

- professor cria/seleciona `LearningTarget`, prepara, abre, bloqueia, revela e encerra a verificação;
- `LearningEvidence` é produzida automaticamente apenas quando a Interaction declara evidência e possui target;
- aluno responde pelo `/join` com token temporário e pode alterar enquanto a execução aceita respostas;
- correção permanece protegida até reveal;
- reconnect restaura o estado individual, inclusive resposta já registrada;
- `LiveStage=LEARNING_CHECK` é participant-only neste primeiro corte;
- projetor permanece fora do slice;
- Quiz continua separado: questão de Atividade + XP; Learning Check: target pedagógico + Evidence, sem XP.

Gates validados em 07/10/2026:

- backend: 149 unitários + 102 integrações, todos verdes via `mvn clean verify`;
- frontend: 295 testes verdes;
- typecheck verde;
- `next build` verde;
- lint sem erros; warnings históricos permanecem;
- Chromium E2E crítico: **5/5** verde, cobrindo também reconnect e Evidence sem XP no Learning Check;
- suíte Playwright completa: **22/22** verde, cobrindo também desktop/mobile/ultrawide e light/dark.

## Estado após consolidação de Quiz/Poll/Nuvem e capacidades de sessão

- Quiz, Poll e Word Cloud possuem adapters/shadow validation no Interaction Core;
- Poll preserva semântica de opinião: `CHOICE + evaluationMode NONE`, sem accuracy/Evidence;
- Word Cloud usa `TEXT LIST + WORD_CLOUD`, mantendo uma Response por participante e frequência normalizada equivalente ao legado;
- Spotlight já separa `ParticipantSelectionService` da apresentação `GRID_SPOTLIGHT`/`WHEEL`; não requer refactor adicional apenas por roadmap;
- Timer já é capacidade transversal própria da sessão, com lifecycle persistido e realtime; não requer absorção pelo Interaction Core;
- Groups passou a suportar geração balanceada e composição manual persistida, com invariantes de participantes presentes, ausência de duplicatas e limite de 12 por grupo.

## Gate arquitetural final — estado atual

O `SessionRuntimeSnapshotService` já materializa o runtime snapshot da sessão; criar um segundo aggregate seria redundante.

A V48 adiciona `interaction_shadow_observations` e o fechamento passa a ter dois contratos consultáveis:

- `/api/learning-core/gate/runs/{runId}/trace` — prova estruturada de AI-ready;
- `/api/learning-core/gate/cutover` — qualificação de Quiz/Poll/Word Cloud por evidência terminal equivalente.

Os três shadows persistem EQUIVALENT/MISMATCH/SYNC_ERROR sem afetar o fluxo legado. O gate exige, por default, 3 rodadas encerradas equivalentes por tipo e nenhuma divergência não resolvida na amostra.

A remoção física das tabelas legadas **não pertence ao mesmo passo do primeiro cutover**: ela permanece bloqueada até uma release com core autoritativo atravessar a janela de rollback. Isso é requisito de reversibilidade, não débito ignorado.

Sequência pós-publicação:

```text
v0.9.0 publicada/congelada com legado autoritativo
→ coleta operacional dos shadows
→ cutover lógico somente quando /api/learning-core/gate/cutover aprovar
→ release com core autoritativo atravessa a janela de rollback
→ somente então remoção física do legado em release posterior
```

A execução local de 2026-10-07 concluiu `release-gate.sh local` com **163 testes unitários backend, 109 integrações, 298 testes frontend e 22/22 E2E Chromium**, além de stack Compose isolada saudável. O backup do banco em V48 também foi restaurado e validado em PostgreSQL 17 temporário.

A qualificação operacional com três rodadas terminais equivalentes por tipo **não é requisito para publicar a v0.9.0**: ela é requisito para tornar o Interaction Core autoridade. A v0.9 precisa ser publicada primeiro para disponibilizar a observabilidade durável que coleta essa evidência. Detalhes e checklist estão em `FINAL_ARCHITECTURE_GATE.md`.

Detalhes: `docs/v0.9/FINAL_ARCHITECTURE_GATE.md`.

Mastery, IA generativa, RAG e novos game modes permanecem fora da baseline congelada e só podem avançar em linhas posteriores com escopo próprio.
