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

## Incremento 3 — Turmas e alunos via API

Substituir apenas a persistência de Turmas/Alunos/Matrículas por REST, preservando a UI atual.

## Incremento 4 — Sessões e presença via API

Migrar início/fim de sessão e presença, mantendo Arena, sorteio, Boss, individual/duplas/grupos e atividades funcionando como hoje.

## Incremento 5 — ScoreEvent + ranking

Tornar o backend a fonte de verdade da pontuação e introduzir reversão auditável.

## Incremento 6 — Mecânicas e atividades persistentes

Migrar sorteio inteligente, organização de turma, Boss Battle, atividades e questões para o backend. O contrato JSON de questões deve permanecer compatível com o formato V1.

## Incremento 7 — Relatórios externos

Adicionar adaptadores para importar relatórios exportados por plataformas externas quando houver um formato estável e valor pedagógico claro. Não acoplar o núcleo a um único fornecedor.

## Incremento 8 — Tempo real

Adicionar join code, QR, WebSocket e Buzzer somente após paridade funcional e persistência das mecânicas atuais.
