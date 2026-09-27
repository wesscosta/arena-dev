# Incremento 16.2 — Learning Resources & Content Ingestion

## Status

**Em execução** na branch `feat/v0.8-content-ingestion`.

O `16.1 — Journey Core` foi integrado à `main` pelo PR #22. O `16.2` amplia a jornada para representar conteúdo de aprendizagem real e cria um onboarding de criação que não depende do professor usar Markdown, Notion ou qualquer ferramenta específica.

## Princípio de produto

> A Arena não exige que o professor organize conteúdo como a Arena quer. A Arena transforma o que ele já tem — inclusive nada — em uma jornada estruturada.

Markdown e Notion são fontes possíveis, não o modelo mental do produto.

## Formas de começar uma jornada

A ação **Nova jornada** oferece quatro caminhos equivalentes:

1. **Criar com IA** — professor descreve turma, objetivo, tempo e contexto; a IA produz apenas um rascunho;
2. **Usar um modelo** — estruturas pedagógicas prontas para sequência de aulas, projeto integrador, preparação para avaliação e aprendizagem por desafios;
3. **Importar material** — arquivo, texto colado ou link; links do Notion são reconhecidos automaticamente como uma fonte possível, sem criar um fluxo principal separado;
4. **Começar em branco** — autoria manual completa.

Nenhum caminho publica conteúdo automaticamente.

## Modelo de conteúdo

O 16.2 adiciona:

```text
Journey
└── JourneySection
    └── JourneyStage / item
        ├── CONTENT
        ├── ACTIVITY
        ├── QUIZ
        ├── CHALLENGE
        ├── CHECKPOINT
        └── EXTERNAL_RESOURCE
```

Conteúdo persistido é representado por `LearningResource`, separado do mecanismo de atividade. Isso evita transformar todo conteúdo em `Activity` e permite que uma jornada misture leitura, referência externa, atividade, quiz, desafio e checkpoint.

## Persistência

### V29 — Learning Resources

Tabela `learning_resources`:

- turma proprietária;
- título, resumo e corpo;
- formato (`MARKDOWN`, `PLAIN_TEXT`, `LINK`);
- procedência (`MANUAL`, `AI`, `TEMPLATE`, `TEXT`, `MARKDOWN`, `FILE`, `URL`, `NOTION`);
- URL/rótulo de origem quando aplicável.

### V30 — Journey Sections & Content Items

- `journey_sections` para módulos/capítulos;
- `journey_stages.section_id`;
- `journey_stages.item_type`;
- `journey_stages.learning_resource_id`.

A progressão do 16.1 continua usando a etapa persistente já existente; o 16.2 adiciona significado pedagógico e conteúdo sem duplicar o mecanismo de progresso.

### V31 — origem FILE

A migration V31 amplia o constraint de procedência de `LearningResource` para `FILE` sem alterar a migration V29 já aplicada, preservando a imutabilidade do histórico Flyway.

## Ingestão agnóstica à fonte

### Texto e Markdown

- texto colado é segmentado em blocos revisáveis;
- Markdown usa headings como pistas estruturais de módulos e itens;
- Markdown não é requisito do produto.

### Arquivos

O wizard aceita seleção ou arrastar-e-soltar. O backend recebe arquivos de até 20 MB e extrai texto sem persistir o arquivo original:

- PDF;
- DOC / DOCX;
- PPT / PPTX;
- Markdown;
- TXT.

A extração usa Apache Tika apenas como adaptador de leitura. O resultado entra no mesmo contrato de rascunho das demais fontes.

### URL e Notion

Nesta fatia, URLs são preservadas como `EXTERNAL_RESOURCE`.

Links comuns entram como `EXTERNAL_RESOURCE`. Se a URL indicar Notion, o wizard reconhece a origem automaticamente e preserva a página como referência; a Arena **não raspa HTML público**. A leitura automática deve ocorrer futuramente por integração autorizada, evitando acoplamento ao frontend público do Notion.

### IA

A IA é um gerador de rascunho, não autoridade de publicação.

O provedor recebe um briefing e retorna uma estrutura normalizada de módulos/itens. A interface exige revisão antes de materializar a jornada. O backend usa configuração própria (`ARENA_AI_API_KEY`, `ARENA_AI_BASE_URL`, `ARENA_AI_MODEL`) e não expõe credenciais ao browser.

## Review-first

A prévia gerada/importada é editável antes da materialização. O professor pode:

- alterar título e descrição da jornada;
- renomear módulos;
- remover módulos;
- renomear itens;
- trocar tipo de item;
- remover itens;
- adicionar e reordenar módulos;
- adicionar e reordenar itens.

Somente a ação **Usar esta estrutura** cria um rascunho persistente de jornada.

## Interface do professor

A aba **Jornadas** continua sendo o ponto de entrada. O botão **+ Nova jornada** abre o wizard source-agnostic em vez de assumir autoria manual. O modal contém foco, fecha com `Esc`, devolve foco ao acionador e bloqueia o scroll da página enquanto está aberto.

O onboarding evita expor Markdown/Notion como modelo mental principal: o professor vê IA, modelo, material ou autoria em branco. Dentro de material, encontra Arquivo, Texto e Link; formatos técnicos e fontes específicas são tratados como adaptadores. Esse desenho atende tanto professores com acervo estruturado quanto quem possui apenas slides, PDF, Word, um link, uma ideia ou nenhum material prévio.

## Fora desta fatia

Ainda não fazem parte do 16.2:

- mapa visual gamificado final do aluno;
- sincronização automática com Notion;
- busca/ingestão remota de URLs arbitrárias;
- geração automática de atividades avaliativas sem revisão;
- Mastery, Skills e achievements;
- publicação automática de conteúdo criado por IA.

## Gates atuais

```text
backend tests                 98 passed
Flyway                        V1–V31 OK
frontend tests                255 passed
frontend typecheck            OK
frontend production build     OK
file ingestion                PDF/DOC/DOCX/PPT/PPTX/MD/TXT
multipart boundary handling   OK
review-before-materialize     OK
wizard keyboard/focus         OK
browser smoke 1440×900        OK
Docker backend/frontend       healthy
```
