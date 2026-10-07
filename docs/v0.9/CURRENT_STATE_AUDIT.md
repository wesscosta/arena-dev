# v0.9 — Current State Audit

**Data:** 2026-10-07  
**Branch de implementação:** `feat/v0.9-learning-core-foundation`  
**Baseline de código:** `main@03bf09c` + handoff auditado `02c4b1c`

## Baseline validada

Antes das alterações funcionais:

- backend: 117 testes unitários verdes;
- frontend: 288 testes verdes;
- working tree limpo;
- Flyway existente até V38.

## Arena runtime atual

### Sessão e realtime

- backend continua autoritativo;
- `useArenaRealtime` agrega Join Code, Buzzer, Timer, Word Cloud, Poll, Quiz e Ranking;
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

## Próximo passo

Após validar V39 e os contratos LearningTarget/ContentRef/Provenance:

```text
InteractionDefinition
→ InteractionRun
→ Response
→ Quiz Adapter
→ Evaluation
→ Result Engine
```
