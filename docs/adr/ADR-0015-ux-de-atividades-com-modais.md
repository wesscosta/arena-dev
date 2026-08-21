# ADR-0015 — Atividades em lista/cards; criação, questões e entregas em modal

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** UX, produto

## Contexto

O primeiro incremento de questões colocou formulário de nova atividade, lista de alunos e gerador/importador de questões na mesma página. O resultado aumentou excessivamente a altura da tela e misturou criação, consulta e lançamento de entregas.

## Decisão

A página **Atividades e XP** passa a priorizar consulta e operação sobre atividades existentes.

No topo:

- `+ Nova atividade`;
- `Importar atividade`.

A lista/cards de atividades mostra resumo e ações, como:

- Abrir;
- Usar na Arena;
- Registrar entrega;
- menu de ações.

Usar modal/dialog grande para:

- criar/editar atividade;
- gerar prompt/importar JSON/criar questões;
- registrar entregas/participação.

O modal pode usar etapas/abas internas (`Geral`, `Questões`, `Recurso externo`, `XP`) se isso reduzir densidade sem aumentar passos desnecessários.

A identidade visual existente deve ser preservada.

## Consequências

### Positivas

- página mais curta e escaneável;
- separação clara entre criar, consultar e registrar entrega;
- espaço para evoluir atividades sem criar uma página infinita.

### Custos e riscos

- modais grandes exigem atenção a responsividade e acessibilidade;
- estado de edição precisa ser preservado ao trocar abas internas.

## Alternativas consideradas

### Manter todos os formulários expandidos na página

Rejeitada pela baixa densidade informacional e scroll excessivo observados na interface.

### Criar várias páginas independentes

Não adotada inicialmente para manter baixa fricção; pode ser reavaliada se a Activity crescer muito.

## Critérios de validação

- [ ] primeira dobra da página mostra ações e atividades, não formulário gigante;
- [ ] criação de atividade não remove contexto da turma;
- [ ] registrar entrega não exige manter lista de alunos sempre expandida;
- [ ] gerador/importador de questões permanece acessível em poucos cliques.

## Relações

- Relacionados: ADR-0001, ADR-0003, ADR-0010, ADR-0011
