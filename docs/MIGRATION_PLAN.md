# Plano incremental de migração

> As decisões que fundamentam este plano estão registradas em `docs/adr/README.md`. Em caso de conflito entre documentação narrativa e uma decisão vigente, o ADR aceito deve ser tratado como registro arquitetural de referência.

## Regra de evolução

A interface V1 é a baseline do produto. Cada incremento deve preservar estética e funcionalidades existentes; novas capacidades entram de forma aditiva.

## Incremento 1 — Fundação persistente

**Status: implementado.**

- Flyway com migrations versionadas;
- `Classroom`;
- `Student`;
- `Enrollment`;
- `ClassSession`;
- `SessionParticipant`;
- APIs REST para turmas, alunos, matrículas, sessões e presença;
- PostgreSQL validado pelo Hibernate (`ddl-auto=validate`).

O frontend permanece local-first para evitar regressão durante a transição.

## Incremento 2 — Organização e conteúdo das atividades

**Status: implementado no frontend local-first.**

- organização `Individual`, `Duplas`, `Trios`, grupos de 4 e grupos de 5;
- modo Individual não polui o histórico de combinações;
- questões incorporadas à `Activity`;
- criação manual de questões;
- pacote JSON versionado `1.0`;
- validação e importação por colagem ou arquivo `.json`;
- gerador de prompt para IA externa sem chave/API;
- presets Revisão, Diagnóstico e Prática;
- tipos genéricos: múltipla escolha, aberta, verdadeiro/falso, correção de bug, análise, prática e situação-problema;
- atividade/recurso externo com plataforma e URL;
- preservação do fluxo de XP e entregas existente.

Referência: `docs/ACTIVITY_QUESTIONS.md`.

## Incremento 3 — Integração de Atividades com Turma e Arena

**Status: implementado no frontend local-first.**

- turma selecionada como contexto explícito de Atividades;
- página de Atividades convertida em catálogo/cards;
- Nova Atividade, Questões, Entregas e Importação em modais;
- cópia independente de atividade entre turmas;
- `Activity → Arena` opcional, preservando modo livre;
- rastreabilidade `ScoreEvent.source`, `activityId` e `questionId`;
- sequência de questões associada à sessão.

Referência: `docs/INCREMENT_3.md`.

## Incremento 4 — Turmas e alunos via API

**Status: implementado.**

- `Classroom`, `Student` e `Enrollment` usam REST/PostgreSQL como fonte de verdade;
- UI atual preservada;
- `localStorage` deixa de persistir cópia autoritativa desses domínios;
- criação, matrícula, ativação/inativação e remoção passam pela API;
- dados experimentais com IDs locais não são remapeados (ADR-0018);
- backup passa a tratar o domínio persistente separadamente.

Referência: `docs/INCREMENT_4.md`.

## Incremento 5 — Sessões e presença via API

**Status: implementado.**

- `ClassSession` e `SessionParticipant` usam REST/PostgreSQL como fonte de verdade;
- sessão ativa é recuperada após reload;
- presença inicial e alterações durante a aula são persistidas;
- encerramento de sessão é persistido;
- uma turma não pode abrir duas sessões `ACTIVE` simultaneamente;
- mecânicas ainda local-first são separadas em `SessionRuntimeState` e referenciam o UUID real da sessão;
- backup não sobrescreve sessões/presença persistidas.

Referência: `docs/INCREMENT_5.md`.

## Incremento 6 — ScoreEvent + ranking

**Status: implementado.**

- `ScoreEvent` usa REST/PostgreSQL como fonte de verdade;
- ranking permanece projeção de `SUM(score_events.points)`, sem tabela/contador duplicado;
- Arena e entregas de atividade gravam XP pela API;
- criação em lote é transacional para entregas;
- correção usa evento inverso com `reversalOf`, sem `DELETE`;
- `source`, `activityId` e `questionId` permanecem disponíveis para filtros/projeções;
- `localStorage` deixa de persistir ScoreEvents;
- backup local não sobrescreve XP persistido.

Referência: `docs/INCREMENT_6.md` e ADR-0007.

## Incremento 7 — Mecânicas e atividades persistentes

**Status: implementado.**

- `Activity` e `ActivityQuestion` usam REST/PostgreSQL como fonte de verdade;
- contrato Arena Dev Question Package `1.0` permanece compatível;
- cópia entre turmas é processada no backend e gera novos UUIDs;
- `SessionDynamic` persiste estado de Sorteio, Grupos, Boss Battle e Arena;
- sorteio inteligente passa a ser decidido no backend;
- grupos são montados no backend usando `group_history` persistido;
- `Individual` não registra pareamentos artificiais;
- Boss, fonte da Arena e sequência de questões sobrevivem a reload;
- novos ScoreEvents validam referências reais de Activity/ActivityQuestion;
- `localStorage` guarda apenas a preferência de turma selecionada.

Referência: `docs/INCREMENT_7.md` e ADR-0020.

## Incremento 8 — Relatórios externos

**Status: implementado.**

- importação permanece dentro de `Turma → Atividades`, vinculada à `Activity`;
- CSV/TSV é normalizado por adaptadores leves para Wayground/Quizizz, Microsoft Forms, Google Forms, Kahoot e formato genérico;
- aluno é associado por matrícula/registro ou nome normalizado, com correção manual antes da gravação;
- XP é calculado proporcionalmente ao desempenho e ao XP configurado na atividade;
- relatório passa por preview e validação antes da importação;
- importações são auditadas em `external_result_imports` / `external_result_rows`;
- fingerprint por atividade bloqueia reimportação acidental do mesmo relatório;
- os resultados geram `ScoreEvent` auditável e não sobrescrevem ranking/histórico.

Referência: `docs/INCREMENT_8.md` e ADR-0013.

## Incremento 9.1 — Refactor de navegação e Home da Turma

**Status: implementado na camada de aplicação/UX.**

- `Visão geral` passa a representar o sistema e o conjunto de turmas;
- cards permitem selecionar e abrir uma turma;
- criação de turma usa fluxo em duas etapas: dados → alunos;
- `Turma` ganha a aba `Home`;
- o antigo dashboard contextual é movido para `Turma → Home`;
- edição concentra nome, código, status e alunos;
- turmas inativas continuam administráveis e preservam histórico;
- exclusão definitiva é permitida somente sem histórico operacional;
- nenhuma mudança de schema é necessária.

Referência: `docs/INCREMENT_9_1.md`, ADR-0021 e ADR-0022.

## Incremento 9 — Tempo real

**Próximo incremento.**

Adicionar join code, QR, WebSocket e Buzzer após a consolidação da arquitetura de informação.
