# Incremento 16.2 — Learning Resources & Content Ingestion

## Status

**Implementação concluída na branch** `feat/v0.8-content-ingestion`; pronta para revisão/merge antes do início do `16.3`.

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

A extração usa Apache Tika apenas como adaptador de leitura. O resultado entra no mesmo contrato de rascunho das demais fontes. O gate inclui arquivos binários reais gerados em teste para **PDF, DOCX e PPTX**, além de TXT/Markdown, verificando a extração de conteúdo pelos parsers efetivos e não apenas mocks.

### URL e Notion

Nesta fatia, URLs são preservadas como `EXTERNAL_RESOURCE`.

Links comuns entram como `EXTERNAL_RESOURCE`. Se a URL indicar Notion, o wizard reconhece a origem automaticamente e preserva a página como referência; a Arena **não raspa HTML público**. A leitura automática deve ocorrer futuramente por integração autorizada, evitando acoplamento ao frontend público do Notion.

### Segmentação heurística de documentos

Documentos Office/PDF sem headings Markdown não são mais convertidos em uma lista plana de parágrafos. O pipeline agora:

- reconhece títulos típicos como `MÓDULO`, `CAPÍTULO`, `UNIDADE`, `AULA`, `TEMA`, `ETAPA`, `SEÇÃO` e títulos numerados;
- remove prefixos estruturais da apresentação (`MÓDULO 1 — FUNDAMENTOS` → `FUNDAMENTOS`);
- cria módulos a partir desses sinais quando existem;
- quando não existem headings suficientes, agrupa documentos longos em partes revisáveis de até três itens, evitando uma única lista extensa;
- mantém documentos curtos em um único módulo para não criar estrutura artificial.

A heurística continua sendo apenas uma sugestão: o professor revisa a estrutura antes da materialização.

### LearningResource CRUD

O contrato administrativo de recursos está completo e protegido por autenticação docente:

- `GET /api/learning-resources?classroomId=...`;
- `GET /api/learning-resources/{id}`;
- `POST /api/learning-resources`;
- `PUT /api/learning-resources/{id}`;
- `DELETE /api/learning-resources/{id}`.

A exclusão retorna conflito quando o recurso já está ligado a uma etapa de jornada, preservando integridade referencial. O frontend possui contrato tipado correspondente em `learning-resource-api.ts`.

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
- revisar e editar o corpo/instruções do item;
- revisar a URL de recursos externos;
- remover itens;
- adicionar e reordenar módulos;
- adicionar e reordenar itens.

Somente a ação **Usar esta estrutura** cria um rascunho persistente de jornada.

## Interface do professor

A aba **Jornadas** continua sendo o ponto de entrada. O botão **+ Nova jornada** abre o wizard source-agnostic em vez de assumir autoria manual. O modal contém foco, fecha com `Esc`, devolve foco ao acionador e bloqueia o scroll da página enquanto está aberto.

O onboarding evita expor Markdown/Notion como modelo mental principal: o professor vê IA, modelo, material ou autoria em branco. Dentro de material, encontra Arquivo, Texto e Link; formatos técnicos e fontes específicas são tratados como adaptadores. Esse desenho atende tanto professores com acervo estruturado quanto quem possui apenas slides, PDF, Word, um link, uma ideia ou nenhum material prévio.

### Journey Builder V2

Após a materialização, a autoria deixa de ser uma sequência plana de formulários. O professor trabalha por **módulos** e **itens tipados**, com duas visões complementares:

- **Estrutura** — edição eficiente de módulos, itens, tipos, ordem, regras e vínculos;
- **Visualizar como aluno** — prévia estrutural da jornada em capítulos e nós de progressão.

A prévia não simula progresso real: o primeiro item aparece apenas como ponto inicial da demonstração e os demais como próximos nós. Estados individuais continuam sendo responsabilidade do contrato de progresso por aluno do Journey Core.

O backend administrativo agora persiste alterações de `sectionId`, `sectionTitle`, `itemType` e `learningResourceId`, permitindo que módulos criados/importados continuem editáveis sem perder a relação com `JourneySection` e `LearningResource`.

## Fora desta fatia

Ainda não fazem parte do 16.2:

- mapa visual gamificado **final** do aluno; o 16.2 contém apenas a prévia estrutural do professor;
- sincronização automática com Notion;
- busca/ingestão remota de URLs arbitrárias;
- geração automática de atividades avaliativas sem revisão;
- Mastery, Skills e achievements;
- publicação automática de conteúdo criado por IA.

## Gates atuais

```text
backend unit tests            107 passed
backend integration tests     76 passed
backend total                 183 passed
Flyway                        V1–V31 OK
frontend tests                258 passed
frontend typecheck            OK
frontend production build     OK
file ingestion                PDF/DOC/DOCX/PPT/PPTX/MD/TXT
real binary samples           PDF/DOCX/PPTX OK
headingless segmentation      OK
LearningResource HTTP CRUD    OK
multipart boundary handling   OK
review-before-materialize     OK
wizard keyboard/focus         OK
browser smoke 1440×900        OK
Docker backend/frontend       healthy
```

## Ajustes transversais de UX — participantes e viewport

Durante a validação do 16.2 foram consolidados dois ajustes transversais no shell docente:

- **Participantes** passou a priorizar leitura: busca por nome/nome de exibição, edição do nome de exibição sob demanda, estado inativo como exceção visual e ações frequentes expostas por ícones com rótulos acessíveis;
- **scroll e viewport** foram separados por contexto. Páginas administrativas usam altura natural e scroll do documento; somente a Arena ao vivo recebe `arena-fullscreen-shell` e confinamento em `100dvh` no desktop.

O bloqueio de scroll de overlays também foi centralizado em `useBodyScrollLock`/`body-scroll-lock`, com contagem de locks simultâneos, restauração do estado anterior do `body` e compensação da largura da scrollbar. Modais, wizard de jornada e Timer Focus não manipulam mais `document.body.style.overflow` de forma independente.

A correção elimina o recorte de listas longas em Alunos e demais páginas sem abrir mão do cockpit full-screen da Arena.
