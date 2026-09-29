# Incremento 16.4D — Achievements Foundation

**Status:** implementado
**Data:** 28/09/2026

## Objetivo

Transformar a rota já reservada de Conquistas em uma fundação persistente baseada em marcos reais do progresso da Journey, sem criar um segundo sistema de progresso, XP implícito, ranking ou economia virtual.

## Decisões de domínio

- Achievement pertence ao **Student**, não à matrícula.
- Achievement é consequência do progresso; nunca controla desbloqueio ou conclusão.
- Conquistas são fatos históricos monotônicos: uma Journey editada ou ocultada depois não revoga um marco legitimamente obtido.
- Não existe endpoint público de unlock.
- O catálogo inicial é estático em \`AchievementCode\`; não foi criada infraestrutura prematura de catálogo/rule engine.
- Proveniência é registrada por \`sourceType/sourceId\`, sem FK destrutiva para Journey/Section/Stage.
- Idempotência é garantida por \`UNIQUE(student_id, achievement_code)\`.

## Catálogo inicial

| Código | Nome | Critério |
| --- | --- | --- |
| \`FIRST_CONTENT_COMPLETED\` | Primeiro Passo | primeira conclusão de conteúdo |
| \`FIRST_MODULE_COMPLETED\` | Primeiro Capítulo | primeiro módulo materializado com todos os conteúdos concluídos |
| \`FIRST_JOURNEY_COMPLETED\` | Primeira Jornada | primeira Journey não vazia com todos os conteúdos concluídos |

## Persistência

Migration: \`V36__student_achievements.sql\`.

Tabela única \`student_achievements\`: student, código, proveniência e instante do marco. Não há \`AchievementDefinition\` persistido porque o catálogo ainda não é configurável pelo professor.

## Avaliação e reconciliação

\`AchievementService\` consulta as duas fontes reais de progresso do Student:

1. \`JourneyStageProgress\` — acesso por matrícula;
2. \`StudentJourneyStageProgress\` — acesso persistente por redemption.

A conclusão de conteúdo avalia conquistas na mesma transação. A consulta da página de Conquistas também executa reconciliação idempotente, permitindo reconhecer progresso criado antes do 16.4D.

Módulos sem seção materializada não são artificialmente tratados como capítulos. Módulos/Journeys vazios não são elegíveis.

## API

\`GET /api/learn/achievements\` retorna somente a projeção necessária ao aluno: resumo + catálogo locked/unlocked.

A resposta de conclusão da Journey preserva \`JourneyStudyView\` e adiciona \`newlyUnlockedAchievements\`. Consultas normais retornam a coleção vazia; somente o request que desbloqueia um novo marco produz feedback.

## Student Experience

\`/learn/achievements\` agora apresenta uma lista editorial, não uma grade de badges: progresso global, estado conquistado/não conquistado, nome e critério pedagógico.

Ao concluir um conteúdo que gera marco novo, o Student Shell recebe feedback não bloqueante via \`aria-live="polite"\`. O toast não é fonte de verdade e não é reproduzido ao recarregar.

## Fora do escopo

- XP automático;
- ranking;
- streak;
- moedas/loja;
- raridade;
- badges configuráveis pelo professor;
- conquistas secretas;
- Mastery;
- rule engine/event bus;
- dashboard de conquistas do professor.

## Gates executados

- migration V36 validada via Testcontainers/Flyway;
- \`JourneyCoreIT\` com cenário de primeiro conteúdo, primeiro capítulo, primeira Journey e idempotência;
- suíte backend completa;
- frontend typecheck;
- suíte frontend existente: 271/271;
- build de produção Next.js;
- \`git diff --check\`.

## Resultado

Com 16.4A, 16.4B, 16.4C e 16.4D implementados, o **16.4 — Student Experience Shell & Workspace Visibility** está tecnicamente completo. Hardening transversal de acessibilidade/E2E/release continua separado do escopo funcional do incremento.
