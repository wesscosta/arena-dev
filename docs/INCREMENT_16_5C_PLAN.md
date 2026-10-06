# 16.5C — Semantic Content Foundation & Ingestion → Library

**Status:** tecnicamente concluído na branch `feat/v0.8-semantic-library`; Release Hardening em execução
**Definido em:** 28/09/2026 · **execução iniciada:** 05/10/2026
**Pré-requisitos concluídos:** 16.5B.1, 16.5B.2 e Gate de Estabilização Arquitetural v0.8.

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


## Implementação de 05/10/2026

### C1–C4 — fundação semântica

- V38: `subject`, `language`, `content_sha256`, `outline_json`, `outline_parser_version` e `learning_resource_tags`;
- `CanonicalDocument` é DTO/value object transitório, não tabela;
- `ContentCanonicalizer` normaliza line endings/whitespace, calcula SHA-256 e produz outline H1–H6 determinístico;
- headings em code fences são ignorados; anchors repetidos recebem sufixo estável;
- `outline_json` é projeção derivada e reconstruível;
- metadata editorial não avança a revisão de conteúdo por si só.

### C5–C6 — ingestão → Biblioteca

- API global `/api/library/ingestion/*`;
- preview para Markdown, texto, arquivo, Notion e URL;
- Notion usa snapshot autorizado quando o provider está configurado; caso contrário, preserva referência externa sem scraping;
- arquivos usam a extração já existente e convergem para o contrato canônico;
- preview/review permite corrigir título, assunto, tags, idioma e Markdown antes da materialização;
- baixa confiança estrutural é sinalizada para revisão; IA continua apenas recomendação/fallback futuro.

### Projeções do recurso

- **Leitura**: body renderizado com anchors determinísticos;
- **Estrutura**: outline textual navegável;
- **Mapa**: projeção visual navegável da mesma árvore;
- nenhum `MindMap`, `KnowledgeNode` ou estado pedagógico paralelo é persistido.

### Primeiras fatias 16.5D–F absorvidas

- discovery por título, resumo, assunto e tags; filtros por assunto/tag/idioma e ordenação;
- endpoint de facets;
- usage da Biblioteca mostra snapshot x revisão corrente por Journey;
- refresh explícito do snapshot apenas em Journey `DRAFT`;
- Journey publicada continua preservada;
- exportação Markdown para portabilidade;
- `Enrollment.preferredName` foi mantido como modelo do nome contextual e a UI passou a tornar **Nome na turma · Editar** explícito.

### Contrato documental

Ver [`CONTENT_CANONICAL_MARKDOWN.md`](CONTENT_CANONICAL_MARKDOWN.md).

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

O 16.5C foi fechado junto às fatias mínimas necessárias de 16.5D–F para evitar quatro ciclos artificiais de entrega. O escopo funcional da Biblioteca v0.8 está congelado; o trabalho restante pertence ao Release Hardening.

### 16.5C — Semantic Content Foundation & Ingestion → Library
**Concluído tecnicamente.** V38, metadata editorial, Markdown canônico, `CanonicalDocument`, canonicalização determinística, parser H1–H6, ingestão revisável e Leitura/Estrutura/Mapa estão materializados. Sem embeddings/LLM em runtime.

### 16.5D — Organization & Discovery
**Fechado no escopo v0.8.** Busca, filtros combináveis, facets e ordenação estão implementados. Paginação, vocabulário controlado e pastas ficam adiados até volume real justificar.

### 16.5E — Revision Awareness & Snapshot Hardening
**Concluído.** Updates genéricos não refrescam snapshots; revisão disponível é indicada e a atualização é operação explícita somente em Journey `DRAFT`. Arquivamento não invalida snapshots existentes.

### 16.5F — Advanced Reuse & Library Closure
**Fechado no escopo v0.8.** Reuso bidirecional, archive/restore e exportação Markdown atendem o gate de fechamento. Reuso em lote, duplicação avançada, compartilhamento institucional, marketplace e colaboração ficam fora.

### 16.6 — Knowledge & Retrieval Foundation — pós-v0.8 / opcional
Não é requisito para fechar a v0.8. Só abrir após corpus real e 16.5C–F estabilizados. É a linha candidata para SemanticChunker, KnowledgeChunk derivado, índice lexical, embeddings, busca híbrida, avaliação de retrieval e, apenas depois, RAG/LLM. Deve reutilizar a experiência de avaliação do Orelhão IA e provar ganho mensurável antes de integrar geração.

### Fechamento da v0.8
Com 16.5C–F fechados, não abrir novo domínio funcional. Executar o Release Hardening Gate transversal: E2E dos fluxos professor/aluno, acessibilidade manual, mobile/ultrawide, segurança/autorização, migrations/restore, performance, limpeza de CSS/dívida conhecida, documentação e release candidate.

Estado: 16.5C–F ✅ → Release Hardening ⏳ → v0.8.0.

16.6 Knowledge/RAG fica posterior e não bloqueia a v0.8.
