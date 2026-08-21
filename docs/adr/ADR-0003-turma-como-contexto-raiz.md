# ADR-0003 — Turma como contexto raiz da experiência

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** produto, UX, domínio

## Contexto

A navegação atual apresenta Turma e alunos, Arena, Atividades, Ranking e Histórico. Sem um contexto explícito, esses módulos parecem produtos independentes. Na prática, todos representam diferentes visões e operações sobre uma mesma turma selecionada.

## Decisão

`Classroom` é o **contexto raiz** da experiência do professor.

O seletor global de turma define o escopo corrente. Quando uma turma está selecionada:

- Turma e alunos mostra seus alunos/matrículas;
- Atividades mostra suas atividades;
- Sessões/Arena operam dentro dessa turma;
- Ranking é calculado para essa turma;
- Histórico é filtrado para essa turma.

A sidebar pode permanecer visualmente igual; o que muda é o modelo de navegação e dados.

## Consequências

### Positivas

- reduz sensação de módulos isolados;
- torna relacionamento entre dados previsível;
- simplifica criação de atividades e sessões, pois a turma já está implícita.

### Custos e riscos

- páginas precisam reagir corretamente à troca de turma;
- operações sem turma selecionada precisam de estado vazio claro.

## Alternativas consideradas

### Cada módulo selecionar sua própria turma

Rejeitada por duplicar contexto e aumentar fricção.

## Critérios de validação

- [ ] troca do seletor global atualiza todas as visões dependentes;
- [ ] uma nova atividade nasce vinculada à turma corrente;
- [ ] ranking e histórico respeitam o mesmo contexto.

## Relações

- Relacionados: ADR-0004, ADR-0010
