# ADR-0010 — Atividades pertencem à turma e podem ser copiadas entre turmas

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** domínio, produto

## Contexto

Atividades não devem existir como registros soltos sem relação com a turma corrente. Ao mesmo tempo, o professor frequentemente reutiliza uma boa atividade em outra turma e precisa poder adaptá-la sem alterar a versão original.

## Decisão

`Activity` pertence a uma `Classroom`.

A criação usa automaticamente a turma selecionada no contexto global.

Uma atividade contém, conforme aplicável:

- título;
- tema/tópico;
- XP e bônus;
- recurso externo opcional;
- questões;
- configurações pedagógicas relacionadas.

**Importar atividade de outra turma cria uma cópia independente.** Copiar:

- conteúdo;
- questões;
- configurações de XP;
- recurso externo;
- critérios/configurações.

Não copiar:

- entregas;
- participantes;
- ScoreEvents;
- resultados;
- histórico.

Uma futura `ActivityTemplate`/biblioteca pode reutilizar o mesmo princípio de criação por cópia.

## Consequências

### Positivas

- cada turma pode adaptar sua atividade;
- resultados não vazam entre turmas;
- reuso fica simples e seguro.

### Custos e riscos

- cópias podem divergir e precisar de identificação de origem apenas se isso agregar valor futuro;
- biblioteca/template ainda precisará de modelo próprio.

## Alternativas consideradas

### Uma Activity compartilhada simultaneamente por várias turmas

Rejeitada inicialmente porque edição em uma turma poderia alterar outras turmas de forma inesperada.

## Critérios de validação

- [ ] atividade nova fica vinculada à turma corrente;
- [ ] importação cria novo ID;
- [ ] resultados da turma de origem não são copiados.

## Relações

- Relacionados: ADR-0003, ADR-0007, ADR-0011, ADR-0012
