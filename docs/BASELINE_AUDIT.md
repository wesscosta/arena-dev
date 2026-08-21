# Arena Dev — Baseline de Produto

Esta versão assume o frontend existente como **baseline oficial de UX e funcionalidades**.

## Regra de evolução

Nenhuma migração de arquitetura deve remover ou descaracterizar uma funcionalidade existente sem decisão explícita.

## Preservar

- identidade visual e navegação;
- Visão geral;
- Turma e alunos;
- Arena e sorteio inteligente;
- pontuação rápida;
- Boss Battle;
- duplas e grupos com redução de repetição;
- Atividades e XP;
- ranking;
- histórico;
- backup/importação.

## Migrar progressivamente para o backend

1. Turmas, alunos e matrículas;
2. sessões e presença;
3. ScoreEvent e ranking;
4. sorteio inteligente e eventos da sessão;
5. grupos, Boss Battle e atividades;
6. exportação/backup.

## Adições posteriores

Depois da paridade funcional:

- código/QR da sessão;
- participação pelo celular/notebook;
- WebSocket;
- Buzzer;
- demais mecânicas absorvidas do ArenaCode.
