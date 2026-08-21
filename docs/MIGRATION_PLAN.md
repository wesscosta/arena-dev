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

Migrar início/fim de sessão e presença, mantendo Arena, sorteio, Boss, individual/duplas/grupos e atividades funcionando como hoje.

## Incremento 6 — ScoreEvent + ranking

Tornar o backend a fonte de verdade da pontuação e introduzir reversão auditável. Usar `source`, `activityId` e `questionId` para filtros/projeções sem criar uma segunda fonte de pontuação.

## Incremento 7 — Mecânicas e atividades persistentes

Migrar sorteio inteligente, organização de turma, Boss Battle, atividades e questões para o backend. O contrato JSON de questões deve permanecer compatível com o formato V1.

## Incremento 8 — Relatórios externos

Adicionar adaptadores para importar relatórios exportados por plataformas externas quando houver um formato estável e valor pedagógico claro. Não acoplar o núcleo a um único fornecedor.

## Incremento 9 — Tempo real

Adicionar join code, QR, WebSocket e Buzzer somente após paridade funcional e persistência das mecânicas atuais.
