# ADR-0021 — Turma como workspace e Arena focada na sessão

- **Status:** Aceito
- **Data:** 2026-08-21
- **Decisão relacionada:** ADR-0003 (Turma como contexto raiz), ADR-0015 (UX de Atividades)

## Contexto

Com a evolução do Arena Dev, `Atividades`, `Ranking` e `Histórico` passaram a respeitar a turma selecionada no domínio, mas continuavam apresentados na navegação lateral como módulos independentes. Isso criava uma inconsistência entre arquitetura e interface: conceitualmente os dados pertenciam à `Classroom`, porém visualmente pareciam globais.

Ao mesmo tempo, a tela da Arena ativa acumulava presença, fonte da atividade, questão, sorteio, pontuação, Boss Battle, organização da turma e ranking em uma única página vertical. A funcionalidade estava correta, mas a densidade operacional aumentava o scroll e dificultava a condução da aula.

## Decisão

A interface passa a refletir explicitamente a hierarquia do domínio.

### Navegação global

A sidebar contém apenas contextos de alto nível:

- Visão geral
- Turma
- Arena
- Backup

### Workspace da turma

Ao entrar em `Turma`, o professor navega entre abas internas:

- Alunos
- Atividades
- Ranking
- Histórico

Essas visões usam sempre a turma selecionada no seletor global. `Atividades`, `Ranking` e `Histórico` deixam de parecer módulos globais independentes.

### Arena

A Arena permanece como workspace operacional da sessão ao vivo, mas é dividida em abas:

- Condução — fonte da Arena, questão, sorteio e pontuação rápida
- Presença — participantes da sessão
- Organização — Individual, duplas, trios e grupos
- Boss Battle — objetivo coletivo

O ranking completo não permanece na Arena. Ele é uma projeção da turma e fica no workspace da `Classroom`; a Visão geral pode continuar exibindo um resumo do ranking.

## Consequências

### Positivas

- A navegação visual passa a corresponder ao modelo de domínio.
- Menos itens de primeiro nível na sidebar.
- Atividades e ranking ficam claramente associados à turma.
- A Arena ativa exige menos scroll e concentra a atenção na dinâmica atual.
- Presença, grupos e Boss continuam acessíveis sem disputar espaço simultaneamente.
- A estrutura prepara URLs futuras como `/classrooms/{id}/activities` sem alterar o conceito do produto.

### Trade-offs

- Algumas operações passam a exigir uma troca de aba interna.
- O estado da aba atual é transitório no frontend e pode evoluir para roteamento explícito posteriormente.

## Restrições preservadas

- Nenhuma regra de negócio migra de volta para o frontend.
- A persistência e a autoridade do backend permanecem inalteradas.
- A identidade visual atual é preservada.
- A Arena continua permitindo trocar de dinâmica durante a mesma `ClassSession`.
