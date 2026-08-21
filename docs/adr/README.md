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

## Template

Use [TEMPLATE.md](TEMPLATE.md) para novas decisões.
