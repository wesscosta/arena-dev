# 16.5C — Semantic Content Foundation & Ingestion → Library

**Status:** planejado / não implementado
**Definido em:** 28/09/2026
**Pré-requisito:** 16.5B.1 — refinamento editorial da Biblioteca.

## Diretriz

A Biblioteca deve ser human-readable e machine-retrievable. LearningResource permanece a fonte canônica. Estruturas para busca, chunks, embeddings e índices de RAG serão derivadas e reconstruíveis; não pertencem à fonte de verdade pedagógica.

O 16.5C prepara conteúdo semanticamente consistente, mas não implementa RAG, embeddings, vector database ou integração com LLM.

## Sequência planejada

### C1 — Semantic Metadata
Evoluir LearningResource com subject opcional, language e tags normalizadas em relação própria. A descrição (summary) continua sendo resumo pedagógico, não categoria.

### C2 — Arena Canonical Markdown
Formalizar CONTENT_CANONICAL_MARKDOWN.md: H1–H6 coerente, listas/tabelas GFM, code fences com linguagem, blockquotes/callouts, tratamento determinístico de aside/HTML residual, whitespace previsível, Unicode e metadata separada do body. Frontmatter é interoperabilidade de import/export, não conteúdo persistido.

### C3 — Canonicalization Engine
Fronteira transitória: NormalizedDocument → ContentCanonicalizer → CanonicalDocument. Canonicalização é estrutural, não reescrita pedagógica por IA.

### C4 — Semantic Structure Parser
Extrair headings em caminhos como Django → Modelagem → Produto → Relacionamentos. SemanticSection começa como DTO transitório; não criar tabela de chunks.

### C5 — Ingestion → Library
Reutilizar adapters existentes: Markdown / Texto / Arquivo / Notion → NormalizedDocument → CanonicalDocument → LibraryMaterializationService → LearningResource. Não criar parsers paralelos.

### C6 — Preview & Review
Antes da persistência: título, descrição, área, tags, idioma, estrutura H1–H6 e preview Markdown. O professor confirma/edita antes de materializar.

### C7 — Discovery
Busca/filtros em title + summary + subject + tags. Busca no body fica fora do primeiro corte.

### C8 — Journey Regression
Provar Library r2 → Journey snapshot r2 → Library r3, mantendo Journey e Student Reader em r2 até atualização explícita.

### C9 — Knowledge/RAG Architecture Contract
Documentar, sem implementar: LearningResource → SemanticSection → SemanticChunker → KnowledgeChunk → lexical/vector indexes → hybrid retrieval → rerank → LLM.

KnowledgeChunk futuro considera resourceId, resourceRevision, sectionPath, subject, tags, language, content, contentHash e tokenCount.

## Princípios herdados do Orelhão IA

- Markdown estruturado como representação textual para recuperação;
- metadata separada do texto vetorizado;
- SHA-256/hash para detectar mudança;
- índice derivado e reconstruível;
- chunking orientado à estrutura, não corte cego;
- avaliar retrieval antes de acoplar geração.

No Arena Dev, metadata vive no banco em LearningResource; Markdown canônico vive no body.

## RAG futuro — regras fixadas

1. Chunks não são fonte da verdade.
2. Embeddings não pertencem a LearningResource.
3. Providers de embedding/LLM devem ser substituíveis.
4. Retrieval deverá ser híbrido: lexical + semantic/vector + metadata.
5. Estar indexado não concede acesso: autorização precede retrieval.
6. Journey mantém snapshot independente da revisão corrente da Biblioteca.
7. Mudança de hash/revision poderá invalidar/reconstruir índices derivados.
8. Chunking prioriza heading/section/paragraph boundaries e só depois token budget.

## Fora do escopo do 16.5C

pgvector/vector store, embeddings, escolha de LLM, chatbot, reranker, KnowledgeChunk persistente, auto-sync de Journey, categorização obrigatória por IA e histórico editorial complexo.

## Gate futuro

Um material real deve ser importado por adapter existente, virar Markdown canônico, preservar metadata/proveniência, produzir sectionPath, renderizar corretamente, gerar snapshot estável, possuir hash determinístico e estar pronto para chunking posterior sem depender de LLM.

## Sequência consolidada de fechamento da v0.8

O 16.5C não encerra sozinho a linha v0.8. Ele encerra a fundação semântica da Biblioteca. Depois dele, a sequência planejada é curta e orientada a produto.

### 16.5C — Semantic Content Foundation & Ingestion → Library
Planejado. Metadata semântica, Markdown canônico, canonicalização, parser estrutural, ingestão revisável, discovery e contrato futuro de RAG. Sem embeddings/LLM em runtime.

### 16.5D — Organization & Discovery
Planejado após C. Refinar organização real do acervo quando houver volume suficiente: filtros combináveis, vocabulário de áreas/tags, paginação/ordenação e estados de descoberta. Não criar pastas/taxonomia complexa sem evidência de uso.

### 16.5E — Revision Awareness & Snapshot Hardening
Planejado após D. Fechar a principal dívida de integridade do reuso: atualização genérica de Journey não pode refrescar silenciosamente snapshots existentes. Introduzir operação explícita para materializar/atualizar revisão, indicar revisão disponível e preservar provenance/snapshot no Reader. Arquivamento não deve invalidar snapshots existentes.

### 16.5F — Advanced Reuse & Library Closure
Planejado após E e condicionado a necessidade real. Operações de reuso em lote/duplicação controlada, refinamentos de provenance e gate final da Biblioteca. Compartilhamento institucional, marketplace e colaboração continuam fora da v0.8.

### 16.6 — Knowledge & Retrieval Foundation — pós-v0.8 / opcional
Não é requisito para fechar a v0.8. Só abrir após corpus real e 16.5C–F estabilizados. É a linha candidata para SemanticChunker, KnowledgeChunk derivado, índice lexical, embeddings, busca híbrida, avaliação de retrieval e, apenas depois, RAG/LLM. Deve reutilizar a experiência de avaliação do Orelhão IA e provar ganho mensurável antes de integrar geração.

### Fechamento da v0.8
Após 16.5F, não abrir novo domínio funcional automaticamente. Executar um Release Hardening Gate transversal: E2E dos fluxos professor/aluno, acessibilidade manual, mobile/ultrawide, segurança/autorização, migrations/restore, performance, limpeza de CSS/dívida conhecida, documentação e release candidate.

Ordem: 16.5C → 16.5D → 16.5E → 16.5F → Release Hardening → v0.8.

16.6 Knowledge/RAG fica posterior e não bloqueia a v0.8.
