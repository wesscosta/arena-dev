# Incremento 3 — Integração de Atividades com Turma e Arena

**Status:** implementado no frontend local-first.

Este incremento corrige a arquitetura de informação de Atividades sem alterar a identidade visual consolidada do Arena Dev.

## Objetivos

- tratar a **turma selecionada** como contexto raiz das atividades;
- reduzir a altura e a carga cognitiva da página `Atividades e XP`;
- conectar explicitamente `Activity → Arena → ScoreEvent → Ranking/Histórico`;
- permitir reutilização de uma atividade entre turmas sem compartilhar resultados;
- manter compatibilidade com dados locais produzidos nos incrementos anteriores.

## UX aplicada

A página principal de Atividades passa a funcionar como catálogo operacional:

- `+ Nova atividade` no topo;
- `Importar atividade` no topo;
- métricas da turma;
- cards/lista das atividades;
- ações `Abrir / editar`, `Registrar entrega` e `Usar na Arena`.

Fluxos extensos são abertos em modal:

- criação/edição da atividade;
- criação manual, Prompt Builder e importação JSON de questões;
- registro de entregas;
- importação de atividade de outra turma.

## Contexto de turma

Toda `Activity` continua contendo `classroomId`. A UI mostra explicitamente a turma do contexto e não solicita novamente uma turma durante a criação.

Trocar a turma no seletor global troca, de forma consistente:

- alunos;
- atividades;
- Arena;
- ScoreEvents;
- ranking;
- histórico.

## Cópia entre turmas

`Importar atividade` cria uma **cópia independente** no destino.

São copiados:

- título;
- tópico;
- configuração de XP;
- recurso externo;
- questões e seus critérios.

Não são copiados:

- alunos;
- entregas;
- ScoreEvents;
- resultados;
- histórico.

As questões recebem novos IDs. A atividade registra `copiedFromActivityId` e `copiedFromClassroomId` para rastreabilidade.

## Activity → Arena

Uma atividade com questões pode ser usada como fonte da Arena.

A Arena suporta dois modos:

1. **Modo livre** — pergunta oral ou conteúdo externo, sem Activity obrigatória;
2. **Atividade** — questões de uma Activity da turma são apresentadas durante a sessão.

A `GameSession` pode registrar:

- `activityId`;
- `currentQuestionId`;
- `answeredQuestionIds`.

O professor pode trocar entre modo livre e uma atividade durante a sessão sem encerrar a aula.

## Rastreabilidade de XP

`ScoreEvent` recebeu campos opcionais para preservar compatibilidade:

- `source` (`ARENA`, `ACTIVITY`, `BUZZER`, `BOSS`, `MANUAL`);
- `activityId`;
- `questionId`.

Eventos de entrega passam a usar `source = ACTIVITY` e a Arena usa `source = ARENA`. Isso prepara ranking e histórico por origem sem criar contadores paralelos.

## Compatibilidade

Os novos campos são opcionais. Backups e dados locais anteriores continuam carregando normalmente.

Eventos antigos de entrega sem `source` continuam sendo considerados nas métricas por meio da categoria `SUBMISSION`.

## Próximos passos

O próximo incremento volta à migração de persistência, começando por Turmas, Alunos e Matrículas via REST sem redesenhar as telas.
