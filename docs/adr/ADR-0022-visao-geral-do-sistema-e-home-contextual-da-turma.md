# ADR-0022 — Separar Visão Geral do sistema da Home contextual da Turma

- **Status:** Aceito
- **Data:** 2026-08-21
- **Decisão relacionada:** ADR-0003, ADR-0021

## Contexto

Após transformar `Classroom` no contexto raiz, a navegação ainda apresentava uma inconsistência: a tela chamada `Visão geral` exibia informações exclusivas da turma selecionada, enquanto `Turma` acumulava criação de turmas, seleção de turma e gestão de alunos.

Isso invertia os níveis de informação e tornava pouco claro quando o professor estava operando o sistema como um todo ou uma turma específica.

## Decisão

Adotar três níveis explícitos de navegação:

```text
Visão geral → sistema / todas as turmas
Turma       → workspace pedagógico da turma selecionada
Arena       → sessão de aula ao vivo
```

### Visão geral

A tela global passa a:

- mostrar cards de todas as turmas;
- permitir selecionar a turma clicando no card;
- criar novas turmas;
- acessar edição administrativa;
- exibir estado ativa/inativa e sessão ativa;
- apresentar indicadores agregados.

### Turma

O workspace ganha uma aba `Home` e mantém:

- Home;
- Alunos;
- Atividades;
- Ranking;
- Histórico.

O conteúdo contextual que antes estava em `Visão geral` é movido para `Turma → Home`.

### Ciclo de vida

- **Inativar** preserva dados e é o caminho padrão para turmas já utilizadas.
- **Excluir** é permitido apenas para turmas sem histórico operacional.
- Uma turma com sessão ativa não pode ser inativada.

## Consequências

### Positivas

- o nome da navegação passa a corresponder ao modelo mental do professor;
- reduz duplicidade entre `Visão geral` e `Turma`;
- o conjunto de turmas fica escaneável por cards;
- ações administrativas ficam concentradas em um fluxo próprio;
- atividades, ranking e histórico deixam de parecer módulos independentes;
- a futura visão do aluno/tempo real entra sem alterar a hierarquia principal.

### Trade-offs

- a Home da Turma adiciona uma quinta aba ao workspace;
- turmas inativas precisam continuar sendo carregadas para fins administrativos;
- exclusão definitiva exige regra server-side para proteger histórico.

## Alternativas rejeitadas

### Manter a Visão geral como dashboard da turma

Rejeitado porque o nome sugere escopo global e duplica a função do workspace da turma.

### Colocar criação de turma dentro de `Turma → Alunos`

Rejeitado porque criação/seleção é uma responsabilidade global, anterior à entrada no contexto de uma turma.

### Permitir exclusão em cascata de qualquer turma

Rejeitado porque destruiria sessões, XP, atividades e auditoria. Para turmas utilizadas, a operação correta é inativar.
