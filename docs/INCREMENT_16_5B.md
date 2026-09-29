# 16.5B — Library Workspace & Reuse

**Status:** implementado
**Data:** 28/09/2026

## Objetivo

Provar a Biblioteca como produto antes de conectar o pipeline de ingestão: o professor cria, encontra, edita, arquiva/restaura e reutiliza materiais em Journeys sem alterar retroativamente snapshots existentes.

## Workspace global

A Biblioteca foi integrada como contexto global do professor, fora da Classroom. A experiência usa lista editorial, empty state orientado, busca por título/resumo, Ativos/Arquivados, criação manual, detalhe, edição e archive/restore.

## Lifecycle

- legado de turma: classroomId preenchido e fora da Biblioteca;
- Biblioteca ativa: libraryVisible=true e archivedAt vazio;
- Biblioteca arquivada: libraryVisible=false e archivedAt preenchido.

A API suporta busca, detalhe, archive e restore. DELETE permanece apenas como compatibilidade; a UI usa archive explícito.

## Reuso bidirecional

**Library → Journey:** no detalhe do material, o professor escolhe uma Journey em rascunho agrupada por turma e o módulo de destino.

**Journey → Library:** o Journey Builder acessa a Biblioteca no nível geral e dentro de cada módulo.

Os dois caminhos usam o mesmo domínio existente. O frontend referencia learningResourceId; o snapshot é materializado pela Journey, sem segunda implementação de cópia.

## Invariantes preservadas

- classroomId vazio não significa recurso público; é Biblioteca do professor no modelo single-teacher atual.
- Student não consulta Biblioteca.
- Editar uma revisão não atualiza snapshots existentes.
- Arquivar não afeta Journey, progresso ou achievements.
- Ingestion, Notion, IA, tags, pastas, diff/version history e seleção granular H2/H3 ficam fora do 16.5B.

## Validação

- backend completo aprovado;
- V37 validada via Testcontainers;
- busca, archive/restore e snapshot cobertos por integração;
- frontend typecheck aprovado;
- 273/273 testes frontend aprovados;
- production build aprovado;
- git diff --check aprovado.

## Próximo incremento

**16.5C — Ingestion → Library:** conectar adapters e NormalizedDocument existentes à Biblioteca, com preview e proveniência, sem criar parsers paralelos.

## 16.5B.1 — Refinamento editorial

Aplicado em 28/09/2026:
- editor usa toda a largura útil;
- título e descrição usam grid responsivo;
- edição Markdown e preview renderizado aparecem lado a lado em desktop;
- em telas menores, Editar/Preview alternam sem comprimir as superfícies;
- área de conteúdo acompanha a altura útil do viewport;
- reader mantém largura editorial própria.

Classificação semântica, canonicalização, ingestão e preparação estrutural para RAG permanecem como planejamento do 16.5C.
