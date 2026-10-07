# Handoff — Arena Dev v0.9

**Versão:** v0.9 — Arena Learning Core
**Origem:** v0.8.0 publicada e congelada
**Tag de origem:** `v0.8.0`
**Merge da v0.8:** `03bf09c35b58878bc22ba43ad114d7b9080e4923`
**PR de fechamento:** #28
**Handoff original:** 06/10/2026
**Auditoria e consolidação:** 07/10/2026

---

## 1. Estado confirmado da v0.8

A v0.8.0 está encerrada. Não reabrir seu escopo funcional.

- backend, frontend e Compose/E2E verdes no gate de release;
- gate local com 21/21 E2E;
- PostgreSQL 17 e Flyway validados até V38;
- Biblioteca Semântica 16.5C–F concluída no escopo MVP;
- README, docs e Notion sincronizados no fechamento;
- GitHub Release v0.8.0 publicada.

A linha `v0.8.x` fica restrita a regressão, segurança, acessibilidade crítica e documentação.

## 2. Fronteiras de produto

- **Jornada:** estudo sequencial, progressão e validação.
- **Atividades:** fazer, produzir, entregar e receber avaliação.
- **Arena:** condução e interação síncrona da aula.
- **Biblioteca:** conteúdo canônico e reutilizável.

A v0.9 não deve transformar a Arena em LMS genérico nem misturar esses domínios.

## 3. Objetivo oficial da v0.9

Transformar a Arena de um conjunto de dinâmicas independentes em um **Arena Learning Core**: um domínio semântico capaz de representar sessão, objetivo de aprendizagem, interação, resposta, avaliação, resultado, evidência e proveniência.

A versão deve funcionar integralmente sem IA. IA será consumidora futura do domínio, nunca dependência das regras essenciais.

### Fluxo implementado pela v0.9

```text
LearningTarget
      ↓
Interaction
      ↓
Response
      ↓
Evaluation
      ↓
Result
      ↓
LearningEvidence
```

### North Star posterior

```text
sessão → interação → evidência → intervenção → nova evidência
```

A intervenção sistemática e o novo ciclo de evidência pertencem principalmente à v0.10 — Learning Loop.

## 4. Decisões arquiteturais congeladas

1. Não reescrever a Arena.
2. Migrar por adapters/strangler, feature flags e validação progressiva.
3. Backend continua autoridade de sessão e realtime.
4. `Interaction` não depende de `ActivityQuestion`; o Quiz legado será adaptado.
5. Biblioteca, Jornada, Atividade e Arena permanecem domínios distintos.
6. Conteúdo não é objetivo de aprendizagem.
7. Evidência não é Mastery.
8. Resposta bruta deve ser preservada separadamente de avaliação e projeções.
9. Proveniência é requisito estrutural para artefatos educacionais.
10. IA não entra no core determinístico da v0.9.
11. Acessibilidade, responsividade, light/dark e reconnect continuam baseline.
12. Gamificação permanece contextual.

## 5. Auditoria do handoff anterior

O handoff original continha decisões que foram superadas pela consolidação do roadmap:

- `topic?` e `competency?` diretamente em Interaction → **substituir por `LearningTarget`**;
- `sourceContentId?` sem contrato → **substituir por `ContentRef`**;
- Evidence apenas como boundary → **v0.9 passa a persistir `LearningEvidence` mínima**;
- seis response types iniciais → **reduzir primitives para `CHOICE` e `TEXT`**;
- `MANUAL` no primeiro EvaluationMode → **não necessário no core inicial**;
- Timer/scoring dentro de Interaction → **permanecem capacidades/configurações transversais, não domínio da Interaction**;
- Groups antes da prova do Interaction Engine → **não deve bloquear o primeiro slice vertical**.

## 6. Estado real relevante do código

A auditoria inicial partiu da V38. O estado atual da branch v0.9 já avançou de forma aditiva até **Flyway V47**:

- V39: Learning Domain Foundation;
- V40: Interaction Definition Foundation;
- V41: Interaction Run Foundation;
- V42: Interaction Responses;
- V43: Interaction Evaluations;
- V44: Quiz Interaction Shadow;
- V45: Learning Evidence;
- V46: Poll Interaction Shadow;
- V47: Word Cloud Interaction Shadow;
- `learning_resources` mantém subject/tags/language, revision, hashes, outline e proveniência de snapshot;
- V38 declara explicitamente que `subject` é metadata editorial flexível, não KnowledgeNode/taxonomia rígida;
- Quiz usa `QuizRound.question_id → activity_questions`;
- `ActivityQuestion` pertence ao domínio Atividade;
- Quiz já preserva resposta bruta em JSON e possui avaliação posterior;
- Poll, Quiz e Word Cloud preservam seus runtimes legados como fonte oficial, mas já possuem adapters/shadow validation no Interaction Core;
- Poll foi mapeado para `CHOICE + evaluationMode NONE` sem gerar Evidence;
- Word Cloud foi mapeada para `TEXT LIST + WORD_CLOUD`, preservando frequência normalizada e uma Response por participante;
- `useArenaRealtime` concentra estados de Buzzer, Timer, Word Cloud, Poll, Quiz e Ranking;
- `useArenaScoring` permanece boundary próprio.

Consequência: `LearningTarget` é um domínio novo e não deve duplicar `subject/tags` da Biblioteca. O adapter do Quiz deverá traduzir a questão legada sem acoplar o novo core a `ActivityQuestion`.

## 7. Domínio-alvo

```text
ArenaSession
├── Participants
├── Groups
├── Utilities
│   ├── Timer
│   └── Selection/Spotlight
└── InteractionRun
    ├── InteractionDefinition
    ├── Responses
    ├── Evaluations
    ├── Result
    └── LearningEvidence

ContentRef ──► InteractionDefinition
LearningTarget ──► InteractionDefinition / LearningEvidence
Provenance ──► artefatos educacionais relevantes
```

## 8. Learning Domain Foundation

### LearningTarget

Modelo inicial:

```text
LearningTarget
- id
- title
- type
- parentId?
- status
```

Tipos iniciais:

`TOPIC`, `OBJECTIVE`, `COMPETENCY`.

Não criar Knowledge Graph, prerequisite graph ou taxonomia automática na v0.9.

### ContentRef

Value contract inicial:

```text
ContentRef
- sourceType
- sourceId
- sourceVersion?
- anchor?
```

Não acoplar Arena às classes internas da Biblioteca.

### Provenance

Contrato mínimo:

```text
Provenance
- origin
- sourceRef?
- createdBy?
- reviewedBy?
- createdAt
```

Origins previstas pelo domínio:

`TEACHER`, `LIBRARY`, `IMPORTED`, `EXAM`, `STUDENT`, `AI`, `SYSTEM`.

Nem todas precisam de fluxo funcional nesta versão.

## 9. Interaction Engine

### InteractionDefinition

```text
InteractionDefinition
- id
- prompt
- responseKind
- responseConfig
- evaluationMode
- evaluationConfig
- presentationMode
- learningTargetId?
- contentRef?
- provenance
- status
- schemaVersion
```

### Primitives iniciais

`CHOICE` e `TEXT`.

Configurações representam experiências específicas:

- single choice = CHOICE, maxSelections=1;
- multiple choice = CHOICE, maxSelections>1;
- true/false = CHOICE com duas opções;
- poll = CHOICE + evaluationMode NONE;
- open response = TEXT;
- word cloud = TEXT + presentationMode WORD_CLOUD.

### EvaluationMode inicial

`NONE`, `CORRECT_ANSWER`.

## 10. InteractionDefinition ≠ InteractionRun

`InteractionDefinition` representa o artefato reutilizável.

`InteractionRun` representa sua execução em uma ArenaSession.

Estados persistidos atuais:

`CREATED`, `ACTIVE`, `CLOSED`.

Bloqueio de respostas e revelação de resultados são estados derivados por timestamps (`responsesLockedAt` e `resultsRevealedAt`), evitando multiplicar estados mutuamente combináveis no enum.

## 11. Response, Evaluation e Result

### Response

Preserva payload bruto e identidade da submissão.

Políticas iniciais:

`ONE_SUBMISSION`, `UPDATE_UNTIL_CLOSE`.

Retry/reconnect não pode duplicar Response, Evaluation ou Evidence.

### Evaluation

Primeiro evaluator: `DETERMINISTIC`.

Outcomes:

`CORRECT`, `INCORRECT`, `PARTIAL`, `NOT_EVALUATED`.

A avaliação não sobrescreve Response.

### Result Engine

Começar por agregadores pequenos:

- ParticipationAggregator;
- ChoiceDistributionAggregator;
- EvaluationAggregator.

Poll não possui accuracy. Word Cloud não possui correctness.

## 12. LearningEvidence

A v0.9 persiste evidência mínima estruturada.

```text
LearningEvidence
- id
- participantId
- learningTargetId
- sourceType
- sourceId
- outcome
- score?
- confidence?
- provenance
- observedAt
```

Inicialmente `sourceType = INTERACTION`.

Nem toda Interaction gera Evidence. Poll/opinião/brainstorm não devem contaminar domínio futuro.

## 13. Evidence ≠ Mastery

```text
Evidence
Evidence
Evidence
   ↓
MasteryProjection
```

Mastery continua fora da v0.9.

Não exibir `Domínio 61%` quando o dado real é apenas `Acerto desta verificação: 61%`.

## 14. Recursos atuais e decisão

| Recurso | Decisão v0.9 |
|---|---|
| Grid | manter como apresentação |
| Spotlight/Sorteio | consolidado: seleção backend separada da apresentação `GRID_SPOTLIGHT`/`WHEEL` |
| Roleta | renderer opcional |
| Timer | consolidado como capacidade transversal de sessão/realtime |
| Participantes/Presença | Session Core |
| QR/Código | Session Core |
| Grupos | consolidado com geração balanceada + composição manual persistida/validada |
| Quiz | primeiro adapter do Interaction Engine |
| Poll/Votação | CHOICE + evaluation NONE |
| Nuvem | TEXT + WORD_CLOUD |
| Buzzer | manter, baixa prioridade |
| Ranking/Pontuação | contextual/opcional |
| Boss | congelar |

## 15. Milestones internos

### v0.9-A — Semantic Interaction

- baseline audit;
- ADRs;
- LearningTarget;
- Provenance;
- ContentRef;
- InteractionDefinition;
- InteractionRun;
- Response;
- Quiz Adapter;
- Evaluation;
- Result Engine;
- shadow validation.

### v0.9-B — Evidence

- LearningEvidence;
- fluxo visível Verificar aprendizagem;
- Poll Adapter/shadow — concluído;
- TEXT/Nuvem Adapter/shadow — concluído;
- Result → ações mínimas.

### v0.9-C — Session Integration

- Session contract — pendente de fechamento;
- Spotlight — consolidado por auditoria, sem refactor adicional necessário;
- Groups — geração balanceada + edição/manual persistida implementadas;
- Timer — consolidado por auditoria, sem refactor adicional necessário;
- legacy removal — pendente após cutover seguro dos adapters;
- AI-ready audit — próximo gate arquitetural.

## 16. Primeiro caminho crítico

```text
Baseline Audit
    ↓
ADRs
    ↓
LearningTarget + Provenance + ContentRef
    ↓
InteractionDefinition
    ↓
InteractionRun
    ↓
Response
    ↓
Quiz Adapter
    ↓
Evaluation
    ↓
Result Engine
    ↓
Shadow Validation
    ↓
LearningEvidence
    ↓
Verify Learning
```

Não migrar todo o restante antes de provar esse slice.

## 17. Estratégia de migração do Quiz

```text
ActivityQuestion legado
        ↓
QuizInteractionAdapter
        ↓
InteractionDefinition
        ↓
InteractionRun
        ↓
Response
        ↓
Evaluation
        ↓
Result
```

`InteractionDefinition` não recebe FK obrigatória para `activity_questions`.

O adapter é a fronteira temporária.

## 18. Shadow validation

Por período de migração:

```text
Responses
  ├── Legacy result
  └── New Result Engine
           ↓
        compare
```

Comparar participação, distribuição e acertos/erros.

O novo engine só vira fonte oficial depois de equivalência explicada.

## 19. Primeiro fluxo visível

A v0.9 precisa provar valor para o professor:

```text
Verificar aprendizagem
        ↓
LearningTarget
        ↓
Interaction
        ↓
Responses
        ↓
Result
        ↓
LearningEvidence
```

Resultado inicial:

- participação;
- número de respostas;
- acertos/erros quando avaliável;
- distribuição.

Condução entregue no primeiro slice:

- preparar uma verificação vinculada a `LearningTarget`;
- abrir respostas;
- bloquear respostas;
- revelar correção;
- encerrar com ou sem revelar;
- preservar resultado encerrado para leitura/reconnect;
- registrar `LearningEvidence` automaticamente durante a avaliação.

`Perguntar novamente` e `Formar grupos` permanecem como próximas intervenções sobre Result; não fazem parte deste primeiro corte visível.

Before & After, Error Clinic e Recovery continuam na v0.10.

## 19.1 Estado implementado — primeiro slice vertical

Em 07/10/2026, o caminho crítico já possui uma implementação vertical funcional:

```text
LearningTarget
  → InteractionDefinition
  → InteractionRun
  → Response
  → Evaluation
  → Result
  → LearningEvidence
  → Verificar aprendizagem
```

Características confirmadas:

- `LearningEvidence` é persistida automaticamente somente para Interaction com `producesEvidence=true` e `LearningTarget`;
- o fluxo nativo **Verificar aprendizagem** é separado do Quiz e não gera XP;
- professor: prepara, abre, bloqueia, revela e encerra;
- aluno: responde no mesmo `/join`, pode alterar enquanto aberto e recebe correção apenas após reveal;
- reconnect restaura a resposta individual por snapshot/endpoint autenticado;
- `LiveStage=LEARNING_CHECK` é destinado a `PARTICIPANTS` neste primeiro corte;
- o projetor não recebe Learning Check nesta etapa;
- professor recebe estado completo; participantes recebem sinal realtime sanitizado e recuperam apenas o próprio estado;
- a última verificação encerrada permanece consultável até uma nova execução.

Gates confirmados após o endurecimento backend:

- backend unit: **149/149**;
- backend integration: **102/102**;
- `mvn clean verify`: verde;
- Flyway V45: validada em bancos de teste isolados.

Gates confirmados no frontend do slice visível:

- testes: **295/295**;
- typecheck: verde;
- production build: verde;
- lint: 0 erros; warnings preexistentes permanecem como dívida técnica;
- E2E crítico Chromium: **5/5**, incluindo Learning Check, reconnect, Evidence sem XP e regressões de Quiz/Buzzer/Boss/roteiro;
- suíte Playwright Chromium completa: **22/22**, incluindo breakpoints desktop/mobile/ultrawide e light/dark.

## 20. AI-ready Gate

Antes do freeze, uma Interaction real deve permitir responder por dados estruturados:

1. de onde veio;
2. quem criou;
3. qual conteúdo/revisão está relacionado;
4. qual LearningTarget;
5. em qual sessão ocorreu;
6. quem respondeu;
7. qual foi a resposta bruta;
8. como foi avaliada;
9. qual evaluator/version;
10. qual resultado;
11. qual LearningEvidence.

Se isso exigir interpretar texto solto ou inspecionar manualmente o frontend, o gate falhou.

## 21. Fora do escopo da v0.9

- Mastery avançado;
- Confidence como experiência completa;
- Before & After completo;
- Clínica do Erro completa;
- Recovery Round;
- geração por IA;
- RAG/embeddings/vector store;
- agentes;
- banco de questões completo;
- Knowledge Graph;
- Mission;
- Student-created Questions;
- Boss novo;
- novos game modes;
- marketplace.

## 22. Próximas versões

- **v0.10 — Learning Loop:** Confidence, Verify Learning expandido, Before & After, Error Clinic, Group by Response, Collective Target, Recovery, Mastery v1.
- **v0.11 — Content Intelligence:** Biblioteca → Arena, Question Bank, questões de concurso, proveniência ampliada, IA assistida, análise de respostas abertas, Arena → Journey.
- **v0.12 — Active Learning:** Missions, group submissions, student-created questions, explanation required, recovery rounds avançadas e response types ricos.

## 23. Gates obrigatórios

Preservar a baseline da v0.8.0:

- backend unit/integration;
- frontend tests;
- typecheck;
- production build;
- `git diff --check`;
- Compose isolado;
- Chromium E2E;
- mobile + ultrawide nos fluxos alterados;
- light/dark;
- reconnect quando realtime;
- documentação sincronizada.

## 24. Métricas

v0.9 instrumenta:

1. **Participation Rate**;
2. **Evidence Coverage**;
3. **Result Action Rate**;
4. **Fricção docente**.

Evolution/Recovery Rate tornam-se métricas principais na v0.10.

## 25. Definition of Done da v0.9

- LearningTarget implementado;
- ContentRef/Provenance disponíveis;
- Interaction Engine estável;
- Response/Evaluation/Result separados;
- Quiz real operando através do novo core;
- shadow validation concluída;
- LearningEvidence persistida;
- Poll e TEXT/Nuvem migrados;
- Groups/Spotlight/Timer consolidados;
- nenhum fluxo crítico da v0.8 regrediu;
- AI-ready Gate aprovado;
- CI/E2E/a11y verdes;
- documentação reflete a arquitetura real.

## 26. Regra para novas propostas

Toda nova funcionalidade deve responder claramente em qual etapa agrega valor:

```text
Content
  ↓
LearningTarget
  ↓
Interaction
  ↓
Response
  ↓
Evaluation
  ↓
Result
  ↓
Evidence
  ↓
Intervention
  ↓
New Evidence
  ↓
Mastery
  ↓
Journey
```

Se não houver resposta clara, a funcionalidade é periférica, experimental ou fora do núcleo da release.
