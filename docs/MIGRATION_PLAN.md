# Plano incremental de migração

## Incremento 1 — Fundação persistente

**Objetivo:** preparar o backend sem alterar o frontend.

Incluído:

- Flyway com migrations versionadas;
- `Classroom`;
- `Student`;
- `Enrollment`;
- `ClassSession`;
- `SessionParticipant`;
- APIs REST para turmas, alunos, matrículas, sessões e presença;
- PostgreSQL validado pelo Hibernate (`ddl-auto=validate`).

O frontend continua **local-first** neste incremento. Isso é intencional para evitar regressão.

## Incremento 2 — Turmas e alunos via API

Substituir apenas a persistência de Turmas/Alunos/Matrículas por REST, preservando a UI atual.

## Incremento 3 — Sessões e presença via API

Migrar início/fim de sessão e presença, mantendo Arena, sorteio, Boss e grupos funcionando como hoje.

## Incremento 4 — ScoreEvent + ranking

Tornar o backend a fonte de verdade da pontuação e introduzir reversão auditável.

## Incremento 5 — Mecânicas

Migrar sorteio inteligente, grupos, Boss Battle e atividades.

## Incremento 6 — Tempo real

Adicionar join code, QR, WebSocket e Buzzer somente após paridade funcional.
