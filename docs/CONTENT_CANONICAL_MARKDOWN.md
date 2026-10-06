# Arena Canonical Markdown

**Status:** contrato ativo da Biblioteca v0.8  
**Parser inicial:** `arena-outline-v1`

## Papel

Arena Canonical Markdown é a representação textual comum usada depois que uma fonte passa por um adapter e antes de o conteúdo ser materializado como revisão de `LearningResource`.

Ele não é uma nova entidade de domínio e não substitui `LearningResource`. O contrato existe para que Markdown, Notion, texto e arquivos convertidos possam chegar à Biblioteca pela mesma fronteira.

```text
Fonte
  → Adapter
  → CanonicalDocument
  → revisão humana
  → LearningResource / revision
```

## Estrutura

- `H1`–`H6` representam hierarquia real do documento.
- Headings dentro de code fences não participam da estrutura.
- A hierarquia é convertida em `sectionPath` e em um outline derivado/reconstruível.
- Headings repetidos recebem anchors determinísticos com sufixo incremental.
- Listas, tabelas GFM, blockquotes, links e code fences permanecem no body.
- O parser não usa LLM quando a estrutura explícita já é suficiente.
- O mapa do conteúdo é apenas outra projeção do mesmo outline.

Exemplo:

```markdown
# Banco de Dados

## SQL

### SELECT

### WHERE

## Normalização

### 1FN
### 2FN
```

Produz conceitualmente:

```text
Banco de Dados
├── SQL
│   ├── SELECT
│   └── WHERE
└── Normalização
    ├── 1FN
    └── 2FN
```

## Metadata editorial

Metadata não fica embutida no Markdown persistido como fonte de verdade:

- `title`;
- `summary`;
- `subject`;
- `tags[]`;
- `language`;
- proveniência;
- revisão/hash.

`subject` e `tags` são classificação editorial flexível. Eles **não são `KnowledgeNode`** e não antecipam a taxonomia pedagógica 17.x.

Alterar apenas metadata editorial não cria automaticamente uma nova revisão de conteúdo. Mudança de body/formato ou URL de um recurso do tipo link cria nova revisão.

## Normalização e hash

O canonicalizer:

1. normaliza finais de linha;
2. remove whitespace externo irrelevante;
3. calcula SHA-256 da representação canônica;
4. produz outline determinístico;
5. registra a versão do parser.

`outline_json` é cache/projeção derivada. Pode ser descartado e reconstruído a partir do body + parser.

## Ingestão

### Markdown
Preserva a estrutura explícita diretamente.

### Notion
Headings/blocos do snapshot autorizado convergem para Canonical Markdown. Sem provider autorizado, a Arena preserva apenas a referência externa; não faz scraping silencioso.

### Texto
Pode reconhecer títulos simples por regras existentes, mas o resultado é revisável antes da materialização.

### PDF / DOCX / PPTX
A extração converte o arquivo para uma representação revisável. Conteúdo com baixa confiança estrutural deve ser revisado pelo professor.

### URL
É referência externa. A Arena não copia conteúdo remoto automaticamente.

## IA

IA é fallback opcional para conteúdo sem hierarquia confiável, nunca requisito para parsing.

Quando usada futuramente:

- só reorganiza/resume informação presente na fonte;
- não acrescenta conhecimento externo silenciosamente;
- a saída permanece revisável;
- a proveniência até a fonte precisa ser preservada.

## Projeções

A mesma revisão de `LearningResource` pode ser exibida como:

- **Leitura** — Markdown renderizado;
- **Estrutura** — outline textual acessível;
- **Mapa** — visualização navegável da mesma árvore.

O mapa não representa Mastery, Knowledge Taxonomy, atividade ou avaliação.

## Acessibilidade

A Estrutura textual é equivalente funcional do mapa e permanece disponível. O mapa não é a única forma de navegar pelo material.

## Fora deste contrato

- embeddings;
- vector store;
- RAG;
- KnowledgeChunk persistente;
- KnowledgeNode;
- Mastery;
- geração automática de questões;
- sincronização bidirecional contínua com fontes externas.
