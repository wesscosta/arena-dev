# ADR-0014 — Migração incremental de localStorage para API/PostgreSQL

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** migração, arquitetura

## Contexto

A V1 local-first possui funcionalidades maduras, mas `localStorage` não é suficiente para multi-dispositivo, tempo real, auditabilidade robusta e persistência central. Uma migração “big bang” aumentaria o risco de regressão.

## Decisão

Migrar por incrementos, preservando comportamento existente até cada domínio atingir paridade.

Sequência vigente:

1. fundação persistente: Classroom, Student, Enrollment, ClassSession, SessionParticipant;
2. organização e conteúdo de atividades no frontend local-first;
3. Turmas/Alunos/Matrículas via API;
4. Sessões/Presença via API;
5. ScoreEvent/Ranking;
6. mecânicas e atividades persistentes;
7. relatórios externos;
8. tempo real: join code, QR, WebSocket, Buzzer.

Durante a transição, código local-first pode coexistir como implementação temporária/fallback controlado, mas a fonte de verdade deve migrar domínio por domínio para o backend.

Cada incremento deve ser commitado e validado separadamente.

## Consequências

### Positivas

- rollback simples;
- menor risco;
- problemas são isolados;
- permite comparar comportamento antes/depois.

### Custos e riscos

- coexistência temporária aumenta complexidade;
- contratos precisam evitar divergência entre modelos local e persistente.

## Alternativas consideradas

### Reescrita total e troca única

Rejeitada após regressão observada na alpha arquitetural.

## Critérios de validação

- [ ] cada incremento possui commit próprio;
- [ ] domínio migrado mantém paridade funcional;
- [ ] frontend não muda de identidade por causa da migração;
- [ ] migrations de banco são versionadas por Flyway.

## Relações

- Relacionados: ADR-0001, ADR-0002
- Plano operacional: `docs/MIGRATION_PLAN.md`
