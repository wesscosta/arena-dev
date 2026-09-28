# Incremento 16.3 — Journey Study Experience

**Status:** Planejado / próximo após integração do `16.2`  
**Linha:** v0.8  
**Decisão base:** [ADR-0045](adr/ADR-0045-jornada-e-estudo-sequencial-nao-workflow-de-atividades.md)

## Objetivo

Transformar Journey em uma experiência real de estudo sequencial e persistente, independente da sessão ao vivo e compartilhada visualmente por aluno e professor.

O incremento deve provar o seguinte ciclo de produto:

```text
Professor cria/importa material
        ↓
Arena organiza em módulos + conteúdos
        ↓
Professor revisa e publica
        ↓
Aluno abre a jornada
        ↓
Estuda um conteúdo
        ↓
Conclui e continua
        ↓
Retorna depois no ponto correto
```

## Escopo funcional

### Modelo mental exposto

O frontend trabalhará somente com:

```text
Journey
└── Module
    └── Content
        └── Progress
```

Não expor como conceitos primários:

- `JourneyItemType`;
- `JourneyUnlockRule`;
- `JourneyCompletionRule`;
- `activityId`;
- quiz/desafio/checkpoint como tipos estruturais da Jornada.

A infraestrutura existente será preservada por compatibilidade e encapsulada atrás dos novos contratos.

## 16.3.0 — Domain cleanup e invariantes

**Status:** concluído na branch em 27/09/2026.

### Objetivo

Fixar no código e na documentação a fronteira entre Jornada, Atividades e Arena antes de ampliar a UI.

### Implementação

- documentar e testar o default de conteúdo novo:
  - `itemType = CONTENT`;
  - `completionRule = MANUAL`;
  - progressão derivada da posição;
- impedir que novos fluxos materializem conteúdo com defaults de Atividade/Quiz/Challenge/Checkpoint; a simplificação visual do Journey Builder fica deliberadamente em `16.3.7`;
- regras avançadas existentes permanecem compatíveis, mas fora da experiência padrão;
- seeds/demo do Journey devem usar apenas módulos e conteúdos;
- manter dados legados sem migration destrutiva.

### Gate

- nenhuma tela principal da Jornada comunica “workflow de atividades”;
- conteúdo novo é materializado como `LearningResource`; `JourneyStage` apenas organiza/referencia o conteúdo e seu progresso;
- documentação e testes expressam a fronteira do ADR-0045.

### Resultado aplicado

- novos defaults sem atividade passam a `CONTENT`; compatibilidade de itens legados com atividade é preservada;
- materialização de drafts converge todos os itens para `CONTENT + MANUAL + LearningResource`;
- templates deixam de criar quiz/atividade/desafio/checkpoint como estrutura da Jornada;
- IA é instruída e normalizada para produzir somente conteúdos de estudo;
- wizard de criação deixa de expor seletor de tipo heterogêneo; links permanecem origem/referência do conteúdo;
- testes de ingestão e frontend foram ajustados para proteger essas invariantes.

## 16.3.1 — Study API independente de `/join`

**Status:** concluído na branch em 28/09/2026.

### Objetivo

Separar estudo persistente de participação temporária em aula.

### Nova camada

```text
JourneyService
→ autoria/administração

JourneyStudyService
→ leitura/progresso/continuidade

StudyPrincipal
→ identidade semântica de estudo (userId/enrollmentId/classroomId/role)
```

### Contrato alvo

```http
GET  /api/learn/journeys
GET  /api/learn/journeys/{journeyId}
GET  /api/learn/journeys/{journeyId}/contents/{contentId}
POST /api/learn/journeys/{journeyId}/contents/{contentId}/start
POST /api/learn/journeys/{journeyId}/contents/{contentId}/complete
```

### DTOs

```text
JourneyStudySummary
JourneyStudyView
JourneyModuleView
JourneyContentView
JourneyContentDetailView
JourneyProgressSummary
```

O frontend não consome entidades JPA nem `JourneyStageProgress` diretamente.

### Estados expostos

```text
COMPLETED
CURRENT
LOCKED
```

Os estados são projeções de estudo, não necessariamente novos estados persistidos. No MVP sequencial, `AVAILABLE` não é exposto: existe um único `CURRENT`; os itens posteriores permanecem `LOCKED`.

### Autorização

- Jornada `DRAFT` não aparece para aluno;
- Jornada `ARCHIVED` não aparece como percurso ativo;
- aluno só acessa jornadas da própria matrícula/turma;
- `contentId` precisa pertencer à Journey solicitada;
- `/api/join/{code}/journeys` deixa de ser contrato canônico e permanece apenas por compatibilidade enquanto necessário.

### Resultado aplicado

- `StudyPrincipal` representa `userId + enrollmentId + classroomId + role`, sem `sessionId` ou `joinCode`;
- `X-Study-Token` usa o device claim persistente já existente apenas para resolver a identidade de estudo;
- `JourneyStudyService` concentra catálogo, detalhe, conteúdo, início, conclusão e projeção de progresso;
- `/api/learn/journeys/**` é independente da sessão ao vivo e expõe apenas jornadas `PUBLISHED` da matrícula ativa;
- `contentId` é o identificador do item sequencial da Journey e sempre é validado dentro da Journey solicitada;
- o MVP projeta exatamente `COMPLETED`, `CURRENT` e `LOCKED`, com no máximo um `CURRENT`;
- conteúdo bloqueado não pode ser aberto, iniciado ou concluído;
- os DTOs públicos de estudo não expõem entidades JPA nem `JourneyStageProgress`;
- `/api/join/{code}/journeys` foi preservado como compatibilidade, sem ser usado pelo novo contrato.

## 16.3.2 — Study shell `/learn`

**Status:** concluído na branch em 28/09/2026.

### Rotas

```text
/learn
/learn/journeys/:journeyId
/learn/journeys/:journeyId/content/:contentId
```

### `/learn`

Tela de retomada, não dashboard complexo.

Exibir:

- **Continue estudando**;
- jornada atual;
- módulo/conteúdo atual;
- percentual;
- CTA `Continuar`;
- demais jornadas publicadas disponíveis.

### Navegação inicial

Manter pequena:

```text
Início
Jornadas
```

Atividades e Conquistas só entram quando houver necessidade real no Student Workspace; não copiar integralmente o protótipo de referência.

### Resultado aplicado

- shell dedicado de estudo em `/learn`, separado visual e estruturalmente de `/join` e do cockpit docente;
- navegação deliberadamente mínima: `Início` e `Jornadas`;
- home de retomada prioriza uma única Journey corrente, conteúdo atual, progresso e CTA `Continuar`;
- catálogo secundário lista as demais jornadas publicadas sem transformar a home em dashboard;
- `/learn/journeys` oferece a listagem integral dos percursos disponíveis;
- `/learn/journeys/:journeyId` já consome a Study API e materializa a estrutura vertical mínima de módulos/conteúdos necessária à navegação, sem antecipar o refinamento visual do 16.3.3;
- rota `/learn/journeys/:journeyId/content/:contentId` foi criada como fronteira de navegação; o leitor real permanece reservado ao 16.3.4;
- cliente `study-api.ts` isola o contrato `/api/learn` do frontend administrativo e não depende de sessão `/join` ativa;
- identificação persistente reutiliza o device claim salvo no dispositivo; ausência/expiração conduz o aluno novamente ao fluxo de identificação, sem inventar autenticação paralela neste incremento.

## 16.3.3 — Journey Study View

**Status:** concluído na branch em 28/09/2026.

### Objetivo

Substituir a prévia em cards por uma representação vertical, legível e estruturalmente equivalente ao percurso de estudo.

### Hierarquia alvo

```text
Backend
3 de 10 conteúdos concluídos                  30%
────────────────────────────────────────────────

01
FUNDAMENTOS                                  CONCLUÍDO

│ ✓ HTTP — Protocolo base da web
│   Conceitos fundamentais do protocolo HTTP
│
│ ✓ REST — Arquitetura de APIs
│
│ ✓ JSON — Formato e parsing

02
CONSTRUINDO APIs

│ ● Primeiro Endpoint                        CONTINUAR
│
│ ○ Validação de dados
│
│ ○ Banco de Dados

03
AUTENTICAÇÃO E SEGURANÇA

│ 🔒 JWT e sessões
│ 🔒 OAuth 2.0
```

### Regras de UI

- evitar card dentro de card;
- módulo é hierarquia, não container visual pesado;
- cor não é o único indicador de estado;
- `CURRENT` recebe o CTA principal;
- `LOCKED` explica bloqueio sem CTA falso;
- progressão global no topo;
- progressão do módulo pode ser discreta;
- nenhuma decoração deve competir com o conteúdo.

### Resultado aplicado

- a Journey deixou de usar `card dentro de card` e passou a uma hierarquia vertical contínua;
- módulos são apresentados por índice, título, descrição opcional e contagem discreta de progresso;
- conteúdos usam linha temporal/estrutural com marcadores textuais e visuais para `COMPLETED`, `CURRENT` e `LOCKED`;
- `CURRENT` é o único estado com CTA primário `Continuar`; `LOCKED` explica a dependência sem oferecer ação falsa;
- progresso global permanece no topo com contagem absoluta e percentual;
- progresso do módulo é secundário (`concluídos/total`) e não compete com a leitura;
- responsividade preserva a hierarquia em telas estreitas sem converter o percurso em pilha de cards;
- a etapa não antecipa o Reader: abrir o conteúdo continua delegando à rota reservada ao 16.3.4.

## 16.3.4 — Content Reader

**Status:** concluído na branch em 28/09/2026.

### Componente central

```text
JourneyContentReader
```

### Layout

```text
← Fundamentos                              3 / 10

REST — Arquitetura de APIs
──────────────────────────────────────────────

conteúdo de estudo

──────────────────────────────────────────────

← HTTP                    Concluir e continuar →
```

### Formatos do MVP

- Markdown;
- plain text;
- link/recurso externo com tratamento seguro.

O leitor deve suportar pelo menos:

- headings;
- parágrafos;
- listas;
- código;
- citações;
- tabelas quando o renderer permitir;
- links.

Não implementar editor rich-text sofisticado neste incremento.

### Resultado aplicado

- `JourneyContentReader` implementado como superfície de leitura dedicada, sem reutilizar cards do dashboard;
- Markdown renderizado com `react-markdown + remark-gfm`, incluindo headings, parágrafos, listas, código, citações, tabelas e links;
- plain text preserva quebras de linha e espaçamento sem ser interpretado como Markdown;
- URLs externas são aceitas somente para `http/https`, abertas em nova aba com `noopener noreferrer` e apresentadas como material complementar, não como substituto silencioso do Reader;
- abertura de conteúdo `CURRENT` registra `start` silenciosamente, sem CTA artificial para “iniciar”;
- conclusão é explícita por `Concluir e continuar`; após a resposta da API, o Reader segue para o novo `CURRENT` ou retorna à Journey quando não há próximo conteúdo;
- conteúdo já concluído continua legível e oferece navegação para o próximo conteúdo desbloqueado;
- cabeçalho contextual mostra módulo e posição `n / total`; rodapé oferece anterior e progressão sem duplicar a navegação global;
- layout responsivo prioriza largura confortável de leitura e não introduz editor rich-text.

## 16.3.5 — Progressão e continuidade

**Status:** concluído na branch em 28/09/2026.

### Default

Progressão sequencial.

```text
conteúdo 1 = CURRENT
conteúdo 2 = LOCKED
conteúdo 3 = LOCKED

concluir conteúdo 1
        ↓
conteúdo 1 = COMPLETED
conteúdo 2 = CURRENT
```

### Ações

- abrir o conteúdo atual dispara `POST /start` silenciosamente no frontend quando necessário; leitura via `GET` permanece sem efeito colateral;
- `Concluir e continuar` conclui o conteúdo e direciona ao próximo;
- percentual deriva do total de conteúdos;
- conclusão do último conteúdo conclui o módulo;
- retorno posterior aponta para o primeiro conteúdo não concluído/disponível.

Não adicionar branching no MVP.

### Resultado aplicado

- `GET` de Journey e conteúdo permanece estritamente sem efeitos colaterais; progresso só nasce em comandos explícitos de `start/complete`;
- `start` tornou-se idempotente também no timestamp: reabrir o conteúdo atual não altera artificialmente `startedAt/updatedAt`;
- catálogo de estudo informa `started` e `lastStudiedAt`, permitindo distinguir uma Journey nunca iniciada de uma retomada real;
- jornadas iniciadas são priorizadas por atividade de estudo mais recente, sem alterar a ordem estrutural dos conteúdos;
- `/learn` retoma diretamente o `currentContentId` persistido/projetado, em vez de obrigar o aluno a reabrir a visão geral da Journey;
- CTA diferencia `Começar` de `Continuar`; jornadas 100% concluídas deixam de ocupar o bloco principal de retomada;
- conclusão continua promovendo exatamente o primeiro conteúdo incompleto para `CURRENT`; após o último conteúdo não existe `CURRENT` residual e o progresso chega a 100%;
- conclusão de módulo permanece derivada: um módulo está concluído quando todos os seus conteúdos estão `COMPLETED`, sem entidade/status paralelo;
- testes cobrem GET sem mutação, start idempotente, retomada no primeiro incompleto e conclusão integral da Journey.

## 16.3.6 — Professor usa a mesma experiência

**Status:** concluído na branch em 28/09/2026.

### Princípio

Não criar telas diferentes de consumo.

```text
JourneyStudyView
├── aluno: leitura + progresso
└── professor: mesma leitura + capacidade Editar jornada
```

### Professor

- pode abrir qualquer Jornada da turma;
- visualiza a mesma estrutura e o mesmo conteúdo;
- recebe CTA `Editar jornada`;
- não cria progresso pessoal persistente no MVP.

Não criar `Enrollment` falso para professor.

### Entrada pelo workspace da turma

```text
Jornadas
→ Ver jornada
→ /learn/journeys/{id}?preview=teacher
```

O parâmetro é capability/contexto de acesso, não uma UI paralela.

### Resultado aplicado

- `JourneyStudyService` passou a oferecer projeção `preview` read-only para professor, reutilizando os mesmos DTOs de Journey, módulo, conteúdo e Reader;
- endpoints docentes vivem sob `/api/journeys/{journeyId}/study-preview/**`, portanto continuam protegidos pela sessão `ROLE_TEACHER`; não foi criado token de aluno, matrícula fictícia ou `JourneyStageProgress` para professor;
- preview permite inclusive Journey em rascunho, para que o docente valide o material antes da publicação;
- no contexto docente todos os conteúdos ficam navegáveis; `CURRENT/LOCKED` não simulam progresso inexistente e nenhum comando `start/complete` é exposto;
- `/learn/journeys/{id}?preview=teacher` reutiliza exatamente a `JourneyStudyView`, acrescentando somente uma barra contextual discreta e CTA `Editar jornada`;
- o Reader reutiliza a mesma rota com `?preview=teacher`, preserva anterior/próximo e não chama `start` nem `complete`;
- Journey Manager recebeu `Ver jornada`, criando a entrada direta do workspace docente para a experiência real de estudo;
- testes garantem que preview não altera quantidade de matrículas nem registros de progresso.

## 16.3.7 — Simplificação do Journey Builder

**Status:** concluído na branch em 28/09/2026.

Essa fatia ocorre **depois** da Study View estar utilizável, para que a autoria seja guiada pela experiência real de consumo.

### Editor alvo

```text
Backend                                      [Ver jornada]

Título
Descrição

01  Fundamentos
    ≡ HTTP — Protocolo base da web
    ≡ REST — Arquitetura de APIs
    ≡ JSON — Formato e parsing
    + Adicionar conteúdo

02  Construindo APIs
    ≡ Primeiro Endpoint
    ≡ Validação de dados
    ≡ Banco de Dados
    + Adicionar conteúdo

+ Adicionar módulo
```

### Remover da UI padrão

- tipo do item;
- atividade vinculada;
- critério de conclusão;
- regra de desbloqueio;
- controles de workflow.

Esses detalhes ficam encapsulados como defaults ou compatibilidade legada.

### Resultado aplicado

- `JourneyManager` deixou de expor tipo de item, atividade vinculada, critério de conclusão, regra de desbloqueio e controles de workflow;
- autoria padrão agora apresenta somente título/descrição da Journey, módulos e conteúdos em ordem;
- novos conteúdos são persistidos com defaults encapsulados `CONTENT + MANUAL + sequência PREVIOUS_STAGE_COMPLETED` (primeiro conteúdo `IMMEDIATE`);
- `JourneyMapPreview` e a aba `Visualizar como aluno` foram removidos; o professor usa `Ver jornada`, que abre a Study View real introduzida em `16.3.6`;
- módulos mantêm renomeação e reordenação; conteúdos mantêm título, descrição, reordenação e remoção;
- o editor foi visualmente achatado: módulo é hierarquia editorial, não card pesado contendo outros cards;
- jornadas publicadas continuam protegidas contra alteração estrutural e são apresentadas em modo compacto de leitura;
- compatibilidade de domínio com tipos/regras legados permanece no backend/API, mas não contamina a autoria padrão da Journey.

## 16.3.7B — Convergência visual com a referência de produto

**Status:** concluído na branch em 28/09/2026.

Fatia adicionada após validação comparativa com o Figma. A infraestrutura de `16.3.0–16.3.7` não encerra a fidelidade visual da experiência de estudo.

Objetivo: aproximar deliberadamente Study Shell, Journey Study View e Content Reader da referência aprovada, preservando as decisões de domínio já consolidadas. Esta fatia cobre shell/navegação do aluno, densidade, coluna de conteúdo, capítulos numerados, linha de progressão, estados concluído/atual/bloqueado e hierarquia visual. Não reintroduzir `JourneyMapPreview`, skill tree ou cards aninhados.

### Resultado aplicado

- Study Shell passa a usar navegação lateral persistente no desktop, com identidade `Arena Dev / Estudos`, e header compacto apenas em viewport móvel;
- a área principal ganhou largura e densidade mais próximas da referência, sem transformar a home em dashboard carregado;
- Journey Study View mantém módulos verticais, mas agora usa capítulos numerados circulares ligados por uma linha estrutural contínua;
- conteúdo atual recebe ênfase editorial por linha/acento, enquanto concluído e bloqueado permanecem distinguíveis por ícone, texto e contraste — não apenas cor;
- espaçamento, tipografia e metadados foram reduzidos para privilegiar hierarquia e leitura, evitando cards aninhados;
- Content Reader foi alinhado à mesma coluna editorial, com largura de leitura controlada e navegação anterior/próximo preservada;
- professor continua usando exatamente a mesma Study View/Reader em modo de prévia, sem uma segunda representação visual;
- comportamento responsivo troca a sidebar por header compacto sem alterar a arquitetura das rotas ou o domínio.

## 16.3.8 — Ingestão/IA alinhada ao novo escopo

O wizard do `16.2` permanece, mas toda fonte converge para:

```text
Source
  ↓
Draft
  ↓
Sections
  ↓
Contents
```

Não gerar quiz/desafio/checkpoint como estrutura de Journey.

### Saída esperada da IA

```json
{
  "sections": [
    {
      "title": "Fundamentos",
      "items": [
        {
          "title": "HTTP",
          "body": "..."
        }
      ]
    }
  ]
}
```

A IA continua sem autoridade de publicação.

## Identidade e acesso

### Problema atual

O aluno atual é identificado temporariamente por sessão via `/join` e `X-Participant-Token`. Isso não representa identidade persistente para estudo assíncrono.

### Estratégia de entrega

Separar em duas etapas:

```text
16.3A
Study API + Study UI + teacher preview/test access

16.3B
Persistent Student Access
```

O desenvolvimento da UX não fica bloqueado pelo redesenho de autenticação, desde que `JourneyStudyService` não dependa de `SessionParticipant` ou do token de `/join`.

`StudyPrincipal` será a fronteira de identidade desde `16.3.1`. Um adapter temporário pode produzir esse principal para testes, mas antes de release para aluno real `/learn` precisa de identidade persistente baseada no usuário/matrícula, sem depender de sessão ativa.

## Componentização alvo

```text
LearnLayout
├── LearnNavigation
└── JourneyStudyPage
    ├── JourneyHeader
    ├── JourneyProgress
    └── JourneyModuleList
        └── JourneyModule
            └── JourneyContentRow

JourneyContentPage
├── ContentBreadcrumb
├── ContentHeader
├── ContentRenderer
├── ContentNavigation
└── CompleteContentButton
```

Não reutilizar o atual `JourneyMapPreview` como componente final. Ele poderá ser removido quando `JourneyStudyView` estiver validado.

## Responsividade

### Desktop

- navegação persistente discreta;
- coluna de leitura com largura confortável;
- sem necessidade de mapa horizontal.

### Tablet

- navegação compacta;
- conteúdo continua vertical.

### Mobile

- topbar;
- conteúdo full width;
- capítulos e conteúdos permanecem lineares;
- nenhum horizontal scrolling obrigatório para percorrer a Journey.

## Acessibilidade

- status sempre combina texto/ícone/semântica, nunca apenas cor;
- progresso usa `role="progressbar"` e atributos `aria-*`;
- conteúdo bloqueado não é um CTA acionável;
- teclado percorre conteúdos em ordem natural;
- foco após `Concluir e continuar` precisa cair no título do próximo conteúdo;
- `prefers-reduced-motion` continua respeitado.

## Testes backend

Cobertura mínima:

```text
published journey visible to enrollment
DRAFT hidden
ARCHIVED not active
first content CURRENT
next content LOCKED
start content
complete content
completion unlocks next
module completion derived
journey percentage correct
cross-classroom access denied
content belongs to requested journey
LearningResource returned correctly
```

## Testes frontend

### Componentes

- módulos renderizados na ordem;
- conteúdo concluído;
- conteúdo atual;
- conteúdo bloqueado;
- percentual;
- CTA `Continuar`;
- aluno não recebe `Editar jornada`;
- professor recebe `Editar jornada`.

### E2E

Fluxo obrigatório:

```text
/learn
→ abrir Journey
→ abrir conteúdo atual
→ concluir
→ próximo conteúdo liberado
→ sair
→ retornar
→ continuar do conteúdo correto
```

## Seed/demo de validação

Criar uma Journey representativa:

```text
Backend

Fundamentos
├── HTTP
├── REST
└── JSON

Construindo APIs
├── Primeiro Endpoint
├── Validação de dados
└── Banco de Dados

Autenticação e Segurança
├── JWT e sessões
├── OAuth 2.0
└── Proteção de rotas

Deploy e Produção
├── Docker
└── Observabilidade
```

Cada item precisa possuir conteúdo suficiente para testar leitura real, não apenas título placeholder.

## Fora do 16.3

Não implementar neste incremento:

- branching/árvore de escolhas;
- skill tree;
- mapa ilustrado separado;
- Boss Battle na Jornada;
- Quiz/Votação/Buzzer/Nuvem como tipos de Journey;
- ranking específico de Journey;
- streak;
- badges por conteúdo;
- certificado;
- SCORM/LTI;
- editor rich-text avançado;
- colaboração em tempo real;
- progresso pessoal persistente do professor;
- Teams/Classroom como requisito do estudo;
- gamificação ornamental sem evidência de valor.

## Critério de conclusão

O incremento está concluído quando o cenário abaixo funciona de ponta a ponta:

```text
Professor
→ importa/cria material
→ Arena organiza módulos + conteúdos
→ professor revisa
→ publica

Aluno
→ acessa /learn sem sessão ao vivo
→ abre a Journey
→ estuda o conteúdo atual
→ conclui
→ próximo conteúdo é liberado
→ sai

Aluno posteriormente
→ retorna a /learn
→ vê o progresso anterior
→ Continuar leva ao ponto correto

Professor
→ abre a mesma Journey
→ vê a mesma experiência de leitura
→ possui Editar jornada
```

## Ordem de execução

1. `16.3.0` — Domain cleanup e invariantes;
2. `16.3.1` — Study API independente de `/join`;
3. `16.3.2` — `/learn` e Study shell;
4. `16.3.3` — Journey Study View;
5. `16.3.4` — Content Reader;
6. `16.3.5` — progresso e continuidade;
7. `16.3.6` — acesso do professor na mesma experiência;
8. `16.3.7` — simplificação do Builder;
9. `16.3.8` — alinhamento final de ingestão e IA.

## Product Gate após 16.3

`16.5 — Question Attempts & Skills`, `16.6 — Mastery`, `16.7 — Review`, `16.8 — Teacher Journey Dashboard` e `16.9 — Minimal Gamification` são **candidatos pós-validação**, não uma sequência automática de implementação.

Não iniciar esses incrementos, achievements ou uma visualização gamificada adicional enquanto o fluxo básico de estudo não estiver validado com usuários reais. O gate deve verificar pelo menos: compreensão da estrutura, retomada do ponto correto, leitura/conclusão sem fricção relevante e utilidade do progresso para aluno e professor. O valor da Journey precisa ser demonstrado primeiro como experiência de aprendizagem, não como quantidade de mecânicas.

### Ajuste de fidelidade visual e execução de atividades — 28/09/2026

Após comparação direta com o export do Figma (`JornadaScreen.tsx`), a convergência visual recebeu uma segunda passagem. A Study View deixa de centralizar uma coluna excessivamente distante da sidebar e passa a seguir a composição da referência: sidebar de 220px, conteúdo alinhado à esquerda com `40px 48px`, Journey limitada a 900px, progresso compacto, capítulos de 32px e conteúdos em cards de 10px de raio. Estados atual, concluído e bloqueado preservam semântica real do domínio.

A experiência de atividades em `/join` também foi corrigida. Uma atividade com muitas questões não é mais expandida integralmente dentro do card estreito do participante. Ao iniciar/continuar, abre um runner em tela inteira com uma questão por etapa, indicador `atual / total`, progresso, navegação `Anterior`/`Próxima` e envio somente no final. O runner possui layouts específicos para mobile vertical e horizontal; em desktop usa largura de leitura de até 900px. Respostas abertas são persistidas ao avançar e respostas de opção continuam com autosave imediato.
