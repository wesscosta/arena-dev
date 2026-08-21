# Ajuste de UX — Workspace da Turma

Este ajuste é posterior ao Incremento 7 e não altera contratos REST, migrations ou entidades. Ele reorganiza a informação para refletir melhor a arquitetura já definida.

## Estrutura final

```text
Arena Dev
├── Visão geral
├── Turma
│   ├── Alunos
│   ├── Atividades
│   ├── Ranking
│   └── Histórico
├── Arena
│   ├── Condução
│   ├── Presença
│   ├── Organização
│   └── Boss Battle
└── Backup
```

## Objetivos

- deixar `Classroom` evidente como contexto de Atividades, Ranking e Histórico;
- reduzir a quantidade de módulos globais aparentes;
- reduzir o comprimento da tela da Arena durante uma sessão;
- manter sorteio e pontuação no centro da experiência ao vivo;
- preservar todas as funcionalidades já persistidas no PostgreSQL.

## Validação recomendada

1. Selecionar uma turma e abrir `Turma`.
2. Alternar entre Alunos, Atividades, Ranking e Histórico sem trocar a turma.
3. Em Atividades, usar `Usar na Arena` e confirmar a abertura da Arena com a atividade selecionada.
4. Durante uma sessão, alternar entre Condução, Presença, Organização e Boss Battle.
5. Confirmar que Presença, grupos, Boss e fonte da Arena continuam após `F5`.
6. Confirmar que o ranking completo é acessado em `Turma → Ranking` e continua refletindo os `ScoreEvent` persistidos.
