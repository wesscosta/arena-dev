# Incremento 9.1 — Refactor de navegação e Home da Turma

## Objetivo

Corrigir a arquitetura de informação antes da entrada de tempo real. A navegação passa a separar claramente três níveis de contexto:

```text
Visão geral = sistema / conjunto de turmas
Turma       = contexto pedagógico da turma selecionada
Arena       = operação da sessão ao vivo
```

Nenhuma mudança de schema é necessária neste incremento.

## Visão geral

`Visão geral` deixa de representar a turma atualmente selecionada e passa a ser a Home do Arena Dev.

Responsabilidades:

- mostrar todas as turmas em cards;
- permitir selecionar uma turma clicando no card;
- mostrar resumo agregado: turmas ativas, matrículas ativas, atividades e sessões em andamento;
- filtrar turmas por `Todas`, `Ativas` e `Inativas`;
- iniciar o fluxo `+ Nova turma`;
- abrir a gestão de uma turma existente.

## Criação de turma

A criação passa a ser guiada em duas etapas:

1. **Dados da turma** — nome e código opcional;
2. **Alunos** — cadastro individual ou importação de lista.

A segunda etapa pode ser concluída sem alunos; a turma continua válida e pode ser preenchida depois.

## Turma como workspace

`Turma` ganha uma Home própria e passa a conter:

```text
Turma
├── Home
├── Alunos
├── Atividades
├── Ranking
└── Histórico
```

A `Home` recebe o conteúdo contextual que antes aparecia indevidamente em `Visão geral`:

- nome/status da turma;
- iniciar/continuar Arena;
- total de alunos, atividades e XP;
- resumo de sessão;
- Top da turma;
- atalhos para Alunos, Atividades, Ranking e Arena.

## Gestão da turma

O modal `Gerenciar turma` concentra:

- nome;
- código;
- status ativa/inativa;
- alunos da turma;
- adição/importação de alunos;
- ativação/inativação de matrícula;
- remoção de matrícula;
- exclusão definitiva, quando permitida.

### Regra de exclusão

`Inativar` é a operação padrão para retirar uma turma do fluxo operacional preservando histórico.

`Excluir` é permitido somente quando a turma ainda não possui histórico operacional — sessões, atividades ou ScoreEvents. Alunos vinculados permanecem como `Student` globais; apenas os `Enrollment` daquela turma são removidos.

Se houver sessão ativa, a turma não pode ser inativada antes do encerramento da sessão.

## Inativas

Turmas inativas:

- continuam visíveis em `Visão geral` por filtro;
- podem ser abertas para consulta e gestão;
- mantêm atividades, ranking e histórico;
- não podem iniciar Arena até serem reativadas.

## Backend

A API existente de atualização de turma passa a ser usada pelo frontend:

```text
PUT /api/classrooms/{id}
```

É adicionado:

```text
DELETE /api/classrooms/{id}
```

O endpoint de exclusão rejeita turmas com histórico operacional.

`GET /api/classrooms?includeInactive=true` passa a alimentar o contexto administrativo para permitir gerenciar e reativar turmas inativas.

## Fora do escopo

Este incremento não inclui:

- join code;
- QR Code;
- visão do aluno;
- WebSocket;
- Buzzer;
- nova migration de banco.

Esses itens permanecem no Incremento 9 de tempo real.

## Validação

1. Acessar `Visão geral` e confirmar que aparecem cards de todas as turmas.
2. Clicar no corpo de um card e confirmar `Turma → Home` como destino.
3. Criar turma em duas etapas e adicionar alunos na etapa 2.
4. Recarregar a página e confirmar persistência.
5. Editar nome/código da turma e confirmar atualização.
6. Inativar uma turma sem sessão ativa e confirmar que Arena fica indisponível.
7. Filtrar `Inativas`, abrir a turma e reativá-la.
8. Criar uma turma vazia e excluí-la definitivamente.
9. Tentar excluir uma turma com sessão, atividade ou XP e confirmar que o backend exige inativação.
10. Em `Turma → Home`, confirmar que ranking, atividades e Arena permanecem acessíveis pelo contexto da turma.
