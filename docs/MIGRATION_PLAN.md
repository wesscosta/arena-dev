# Plano incremental de migração

> As decisões que fundamentam este plano estão registradas em `docs/adr/README.md`. Em caso de conflito entre documentação narrativa e uma decisão vigente, o ADR aceito deve ser tratado como registro arquitetural de referência.

> O estado corrente consolidado está em `docs/STATUS_ATUAL.md`. As descrições abaixo preservam o contexto histórico de cada incremento.

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

Neste estágio histórico, o frontend permaneceu local-first para evitar regressão durante a transição. Essa condição foi encerrada progressivamente nos incrementos posteriores.

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
- o domínio operacional deixa de usar `localStorage` como fonte de verdade; o painel guarda a preferência de turma e a rota pública `/join` mantém separadamente o acesso temporário do participante para reconexão.

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

## Incremento 9.2 — Refinamento final da navegação

**Status: implementado.**

- seletor de turma consolidado no header como `context switcher`;
- sidebar dedicada somente à navegação global;
- Visão geral sem banner redundante;
- botão `+ Nova turma` alinhado aos filtros;
- cards de turma preservados como principal entrada do contexto;
- guias da Turma permanecem `Home`, `Alunos`, `Atividades`, `Ranking` e `Histórico`.

## Incremento 10 — Tempo real

**Status: implementado. A validação manual em Docker/LAN está registrada no handoff; ainda não há regressão automatizada no repositório.**

- código temporário por `ClassSession`;
- QR Code para `/join?code=...`;
- visão mobile-first do aluno;
- identificação por matrícula ou nome exato sem expor roster;
- token temporário opaco com hash SHA-256 no PostgreSQL;
- WebSocket por sessão para estado conectado e eventos ao vivo;
- Buzzer persistido com rodada, cliques e posição oficial;
- lock pessimista da rodada antes de ordenar cliques concorrentes;
- XP do Buzzer continua usando `ScoreEvent`;
- código é desativado ao encerrar a sessão.

Referência: `docs/INCREMENT_10.md`, ADR-0006 e ADR-0023.


## Incremento 11.1 + 11.2 — Security Boundary e Realtime Hardening

**Status: implementado em código, sem cobertura automatizada suficiente.**

- autenticação do professor por Spring Security + sessão HTTP;
- APIs administrativas protegidas por `ROLE_TEACHER`;
- join do aluno continua público e temporário;
- token removido da URL do WebSocket;
- proteção contra reivindicação concorrente do mesmo participante;
- liberação de dispositivo pelo professor;
- conexão múltipla, heartbeat, rate limit lógico e broadcast pós-commit no Buzzer.

Limites confirmados na baseline `1738b26`:

- o rate limit implementado é por socket e não cobre tentativas de login;
- existem credenciais default para desenvolvimento local;
- a política `SameSite`/`Secure` do cookie não está configurada explicitamente;
- CSRF permanece desabilitado;
- não existe migration `V7`; o schema corrente termina na `V6`.

Referência: `docs/INCREMENT_11_1_11_2.md` e ADR-0024.

## Incremento 11.3 — Automated Tests

**Status: parcial; 11.3A e 11.3B validados em Java 21, Docker e PostgreSQL 17.**

- `DomainSmokeTest` permanece como teste unitário rápido;
- Maven Failsafe separa testes de integração no gate `mvn verify`;
- Testcontainers sobe PostgreSQL 17 e valida as migrations `V1`–`V6` e o schema operacional;
- a suíte cobre health público, proteção das APIs administrativas, login, sessão, criação autenticada, logout e credenciais inválidas;
- a nova suíte cobre sessão ativa única, participantes/presença, XP, reversão, ranking derivado e rollback de lote;
- a suíte transacional foi validada com quatro cenários e integra o gate de oito testes de infraestrutura;
- falta teste concorrente do Buzzer;
- faltam testes frontend.

Referência: `docs/INCREMENT_11_3.md`.

## Incremento 11.4 — E2E, CI e release hardening

**Status: planejado.**

- Playwright;
- GitHub Actions;
- validação de Compose, secrets e dependências;
- checklist e evidências de release.
