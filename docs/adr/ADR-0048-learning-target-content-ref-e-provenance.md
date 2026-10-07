# ADR-0048 — LearningTarget separado de conteúdo e proveniência rastreável

- **Status:** Aceito
- **Data:** 2026-10-07
- **Decisores:** equipe Arena Dev
- **Escopo:** arquitetura | dados | produto

## Contexto

A Biblioteca v0.8 já possui `subject`, tags, idioma, revisão, hashes e proveniência de snapshot. A migration V38 declara explicitamente que `subject` é metadata editorial flexível e não uma taxonomia rígida. Ainda falta representar o que uma interação pretende observar pedagogicamente.

## Decisão

Introduzir `LearningTarget` como conceito próprio:

```text
LearningTarget
- id
- title
- type
- parentId?
- status
```

Tipos iniciais:

- `TOPIC`;
- `OBJECTIVE`;
- `COMPETENCY`.

`LearningTarget` não substitui subject/tags da Biblioteca.

Introduzir `ContentRef` como value contract para referência desacoplada a conteúdo e `Provenance` para origem/auditoria de artefatos educacionais.

Nenhum Knowledge Graph, prerequisite graph ou classificação automática faz parte desta decisão.

## Consequências

### Positivas

- separa descoberta editorial de semântica pedagógica;
- evita acoplamento Arena ↔ internals da Biblioteca;
- cria base estável para Evidence e IA futura.

### Custos e riscos

- haverá relação adicional a ser mantida entre conteúdo e alvo pedagógico;
- hierarquias profundas podem exigir regras posteriores.

## Alternativas consideradas

### Reutilizar learning_resources.subject como LearningTarget

Rejeitada porque subject é editorial, livre e deliberadamente não taxonômico.

### Criar Knowledge Graph já na v0.9

Rejeitada por superengenharia e ausência de dados de uso.

## Critérios de validação

- [ ] LearningTarget pode existir sem conteúdo;
- [ ] conteúdo pode ser referenciado sem importar classes da Biblioteca no core da Arena;
- [ ] origem de artefatos novos pode ser registrada de forma estruturada.

## Relações

- ADRs relacionados: ADR-0045, ADR-0046, ADR-0047
- Substitui: nenhum
- Substituído por: nenhum
