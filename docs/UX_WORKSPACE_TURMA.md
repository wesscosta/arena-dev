# UX — Visão geral, Workspace da Turma e Arena

A arquitetura de informação do Arena Dev segue três níveis explícitos:

```text
Arena Dev
├── Visão geral
│   ├── Cards de turmas
│   ├── Nova turma
│   ├── Ativas / Inativas
│   └── Seleção da turma
├── Turma
│   ├── Home
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

## Regra de contexto

- `Visão geral` responde **quais turmas existem e qual devo abrir?**
- `Turma` responde **o que quero fazer com esta turma?**
- `Arena` responde **o que está acontecendo nesta aula agora?**

## Visão geral

A tela é global e não depende de uma turma para existir. Cada turma aparece em um card clicável, com quantidade de alunos, atividades, eventos de XP, status e sessão em andamento. Criar e administrar turmas também pertence a este nível.

## Home da Turma

A Home é contextual e concentra o antigo dashboard da turma: iniciar/continuar Arena, métricas da turma, Top da turma e atalhos operacionais.

## Gestão

A edição da turma é modal e concentra dados, status e alunos. Inativação preserva histórico. Exclusão definitiva fica restrita a turmas ainda sem histórico operacional.

## Arena

A Arena permanece focada na sessão ao vivo e usa abas para evitar uma tela vertical excessivamente longa.
