# Architecture Decision Records — Arena Dev

Este diretório registra as decisões arquiteturais, de produto e de UX que orientam a evolução do Arena Dev.

## Convenção

Cada decisão usa um ADR numerado e segue o ciclo:

- `Proposto` — em discussão;
- `Aceito` — decisão vigente;
- `Substituído` — uma decisão posterior passou a valer;
- `Rejeitado` — opção avaliada e descartada.

ADRs aceitos **não devem ser reescritos para esconder mudanças de direção**. Quando uma decisão relevante mudar, crie um novo ADR e indique qual registro ele substitui.

## Índice

| ADR | Decisão | Status |
| --- | --- | --- |
| [ADR-0001](ADR-0001-baseline-ux-sem-regressao.md) | Preservar a V1 como baseline de UX durante a reengenharia | Aceito |
| [ADR-0002](ADR-0002-monolito-modular-e-stack.md) | Monólito modular com Next.js, Spring Boot, PostgreSQL e Docker | Aceito |
| [ADR-0003](ADR-0003-turma-como-contexto-raiz.md) | Turma como contexto raiz da experiência | Aceito |
| [ADR-0004](ADR-0004-sessao-representa-aula.md) | Sessão representa a aula e contém múltiplas dinâmicas | Aceito |
| [ADR-0005](ADR-0005-identidade-matricula-e-participacao.md) | UUID interno, matrícula de negócio e participação por sessão | Aceito |
| [ADR-0006](ADR-0006-backend-autoritativo-e-tempo-real.md) | Backend autoritativo; WebSocket apenas onde tempo real agrega valor | Aceito |
| [ADR-0007](ADR-0007-scoreevent-e-ranking.md) | ScoreEvent como fonte de verdade e ranking como projeção | Aceito |
| [ADR-0008](ADR-0008-sorteio-inteligente.md) | Preservar sorteio inteligente e migrar decisão para o backend | Aceito |
| [ADR-0009](ADR-0009-organizacao-individual-duplas-grupos.md) | Individual, duplas, trios e grupos com histórico sem falsos pareamentos | Aceito |
| [ADR-0010](ADR-0010-atividades-pertencem-a-turma.md) | Atividades pertencem à turma e podem ser copiadas entre turmas | Aceito |
| [ADR-0011](ADR-0011-questoes-na-atividade-e-json-v1.md) | Questões na atividade, JSON v1 e Prompt Builder provider-agnostic | Aceito |
| [ADR-0012](ADR-0012-arena-consome-atividades-opcionalmente.md) | Arena pode consumir questões de atividades sem depender delas | Aceito |
| [ADR-0013](ADR-0013-ferramentas-externas-de-quiz.md) | Integrar ferramentas externas em vez de recriar seus ecossistemas | Aceito |
| [ADR-0014](ADR-0014-migracao-incremental-localstorage-api.md) | Migração incremental de localStorage para API/PostgreSQL | Aceito |
| [ADR-0015](ADR-0015-ux-de-atividades-com-modais.md) | Atividades em lista/cards; criação, questões e entregas em modal | Aceito |
| [ADR-0016](ADR-0016-dinamicas-e-ferramentas-auxiliares.md) | Separar dinâmicas de aula de ferramentas auxiliares | Aceito |
| [ADR-0017](ADR-0017-tres-experiencias-mesmo-sistema.md) | Professor, aluno e projetor como três experiências do mesmo sistema | Aceito |
| [ADR-0018](ADR-0018-fronteira-limpa-na-migracao-do-dominio-de-turma.md) | Fronteira limpa ao migrar Classroom/Student/Enrollment para o backend | Aceito |
| [ADR-0019](ADR-0019-sessao-e-presenca-no-backend-runtime-local-das-mecanicas.md) | Sessão e presença no backend; runtime local separado para mecânicas ainda não migradas | Aceito |
| [ADR-0020](ADR-0020-mecanicas-e-atividades-autoritativas-no-backend.md) | Atividades e mecânicas da sessão autoritativas no backend | Aceito |
| [ADR-0021](ADR-0021-turma-como-workspace-e-arena-focada-na-sessao.md) | Turma como workspace e Arena focada na sessão | Aceito |
| [ADR-0022](ADR-0022-visao-geral-do-sistema-e-home-contextual-da-turma.md) | Visão geral do sistema separada da Home contextual da Turma | Aceito |
| [ADR-0023](ADR-0023-join-temporario-e-buzzer-autoritativo.md) | Join temporário por sessão e Buzzer autoritativo | Aceito |
| [ADR-0024](ADR-0024-fronteira-de-seguranca-e-hardening-realtime.md) | Fronteira de segurança do professor e hardening realtime | Aceito |
| [ADR-0025](ADR-0025-release-readiness-e-versionamento.md) | Release readiness, versionamento `0.3.x` e fronteira de rollback | Aceito |
| [ADR-0026](ADR-0026-community-mit-e-produto-comercial-verit.md) | Arena Dev Community sob MIT e produto comercial Verit em repositório privado separado | Aceito |
| [ADR-0027](ADR-0027-live-stage-e-projecoes-por-audiencia.md) | Live Stage autoritativo e projeções por audiência | Aceito |
| [ADR-0028](ADR-0028-preferred-name-e-identidade-de-dispositivo.md) | Preferred name por matrícula e identidade opaca de dispositivo | Aceito |
| [ADR-0029](ADR-0029-orquestracao-live-flow-live-stage.md) | Live Flow orquestra Live Stage sem duplicar runtimes especializados | Aceito |
| [ADR-0030](ADR-0030-runtime-snapshot-publico-e-reconnect.md) | Snapshot público de runtime e política de reconnect | Aceito |
| [ADR-0031](ADR-0031-session-event-linha-do-tempo-operacional.md) | SessionEvent como linha do tempo operacional, não como runtime | Aceito |
| [ADR-0032](ADR-0032-hardening-e-release-gate-v0-4.md) | Hardening, E2E e fronteira de evidência para a release v0.4.0 | Aceito |
| [ADR-0033](ADR-0033-quiz-runtime-e-respostas-estruturadas.md) | Quiz Runtime reutiliza ActivityQuestion e preserva ScoreEvent como fonte de XP | Aceito |
| [ADR-0034](ADR-0034-maquina-de-estados-do-quiz-e-resposta-mutavel.md) | Máquina de estados do Quiz e resposta mutável antes do lock | Aceito |
| [ADR-0035](ADR-0035-resposta-quiz-rest-e-websocket-como-projecao.md) | Resposta de Quiz via REST; WebSocket permanece como projeção | Aceito |
| [ADR-0036](ADR-0036-reveal-do-quiz-e-fechamento-nao-implicito.md) | Reveal do Quiz é explícito; fechar não revela resultado | Aceito |

## Template

Use [TEMPLATE.md](TEMPLATE.md) para novas decisões.
