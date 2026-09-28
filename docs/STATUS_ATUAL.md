# Estado atual — Arena Dev

**Última sincronização documental:** 28 de setembro de 2026

**Baseline publicada:** `v0.7.0 — Educational Integrations`.

**Linha ativa:** `v0.8 — Professor Experience & Journey MVP`.

**Incremento atual:** `16.3 — Journey Study Experience` em fechamento técnico e `16.4 — Student Experience Shell & Workspace Visibility` iniciado na branch ativa.

**Branch ativa:** `feat/v0.8-content-ingestion`.

## Estado resumido

A v0.7.0 está encerrada e publicada. `16.0` e `16.1` foram integrados à `main`; a branch ativa acumula o fechamento do `16.2` e a execução do `16.3`.

A Journey já possui Study API própria, `/learn`, Reader, progresso e retomada, prévia do professor na mesma experiência, Builder reduzido a módulos + conteúdos e Progression UX com estados `COMPLETED`, `CURRENT` e `LOCKED`.

A frente de ingestão `16.3.8` já cobre contrato normalizado, adapters Markdown/Text/Notion, Review UX, proveniência, fallback AI-ready, OAuth autorizado do Notion e seleção/importação de páginas pelo Journey Builder. Em paralelo, o `16.4` iniciou o shell unificado do aluno e revelou o próximo gate de produto: matrícula não deve expor automaticamente uma turma no espaço persistente de estudo.

## Baselines

```text
baseline publicada        v0.7.0
linha ativa               v0.8
último integrado à main   16.1 · PR #22
incremento atual           16.4 · Student Experience Shell & Workspace Visibility
fatia atual                16.4A · Student Workspace Visibility (planejada)
branch                     feat/v0.8-content-ingestion
schema                     Flyway V1–V33
providers                  Microsoft Teams + Notion OAuth
Google Classroom           standby
```

## Journey Study Experience — implementação atual

- `/learn` e Study API independentes da sessão ao vivo;
- Reader de `LearningResource` com Markdown/GFM e texto simples;
- progresso persistente e retomada do conteúdo `CURRENT`;
- estados `COMPLETED`, `CURRENT` e `LOCKED` como fonte de verdade da progressão;
- CTA **Continue de onde parou** derivado do estado real, sem progresso inventado;
- mesma experiência de estudo para aluno e professor, com modo de prévia sem registrar progresso;
- Journey Builder simplificado para módulos/capítulos + conteúdos;
- UI convergida com a referência visual e timeline com semântica de progresso;
- atividades, Quiz e dinâmicas permanecem fora da estrutura da Journey.

## Content Ingestion & Structured Import — 16.3.8

- fontes convergem para `Draft → módulos → conteúdos → revisão humana → materialização`;
- Markdown possui entrada explícita no wizard;
- `H1` sugere o título, `H2` vira módulo e `H3` vira conteúdo;
- `H4–H6` permanecem dentro do corpo do conteúdo;
- headings dentro de code fences não alteram a estrutura;
- `H2` sem `H3` e com corpo vira um único conteúdo, sem hierarquia inventada;
- Markdown estruturado não chama IA para reinterpretar estrutura explícita;
- PDF/Office/texto continuam suportados pelo pipeline do 16.2;
- Notion possui adapter nativo, provider via API oficial, OAuth e seleção de páginas autorizadas no Journey Builder;
- credenciais OAuth ficam no backend; token manual permanece apenas como fallback técnico;
- MVP de importação é snapshot, sem sincronização contínua/bidirecional;
- IA permanece opcional para material ambíguo e sem autoridade de publicação.


## Student Experience Shell — 16.4

- `/learn` prioriza retomada e jornadas em andamento; concluídas deixam de poluir a Home;
- `/learn/journeys` é a biblioteca pessoal de percursos, com busca, filtro por turma/estado e agrupamento multi-turma;
- `/learn/live` integra a entrada ao vivo ao shell autenticado reutilizando o mesmo `StudentJoinFlow` de `/join`;
- `/join` permanece porta pública para QR/código e não depende do espaço persistente de estudo;
- `/learn/achievements` está reservado para conquistas baseadas em critérios acadêmicos reais;
- próximo corte `16.4A`: adicionar gate explícito de turma para o professor decidir se ela compõe o espaço de estudo do aluno;
- desabilitar o workspace deverá ocultar conteúdo sem apagar progresso.

## Marcador de roadmap — 16.5 Content Library & Reuse

- biblioteca futura será construída sobre auditoria/evolução de `LearningResource`, evitando um segundo modelo paralelo de conteúdo;
- materiais poderão nascer de Markdown, Notion, arquivo ou IA e ser reutilizados em Journey/Activity/Arena;
- o acervo do professor não será automaticamente visível ao aluno;
- primeiro gate: estabilizar `16.4A`; depois validar ownership, metadados, busca, ciclo de vida e semântica de reuso/snapshot.

## UX transversal — shell e participantes

- páginas administrativas voltaram a crescer conforme o conteúdo, com scroll natural do documento;
- confinamento `100dvh`/`overflow: hidden` ficou restrito à Arena ao vivo via `arena-fullscreen-shell`;
- scroll lock de overlays centralizado e seguro para locks simultâneos;
- tela de participantes simplificada com busca, nome de exibição sob demanda e ações por ícones;
- regressão transversal atual validada com 264 testes de frontend e build de produção;

## Professor Arena Experience — implementado

- tabs antigas removidas da Arena;
- sidebar persistente por ação;
- Dinâmicas e Ferramentas separadas;
- header operacional de sessão;
- Arena full-width em desktop;
- rail de participantes e código de sessão;
- Timer, Organização e Presença como ferramentas contextuais;
- Pontuação Rápida transversal;
- Sorteio Inteligente com backend autoritativo;
- Configurações exibem apenas políticas reais;
- histórico e cobertura de sorteios;
- roleta SVG com segmentos reais e geometria circular preservada;
- marcador fixo sobre o slot vencedor, sem autoridade de domínio;
- carrossel adaptativo com slots ímpares e slot neutro para turmas pares pequenas;
- animação em aceleração, giro sustentado e desaceleração;
- rail com filtro Presentes/Todos;
- QR ampliável em Presença e acesso;
- indicadores de online e presença consolidados no roster;
- selects nativos com contraste dark consistente;
- Quiz, Votação, Nuvem de Palavras, Buzzer e Boss Battle em workspace de altura integral no desktop.

## Fechamentos anteriores

- `16.0` concluído e mergeado no PR #21;
- `16.1` concluído e mergeado no PR #22.

## Validação corrente

```text
backend tests        101 passed (último gate executado)
frontend tests       264 passed
frontend typecheck   OK
frontend build       OK
Flyway               V1–V33
```

## Próximo gate

Implementar `16.4A — Student Workspace Visibility`: separar matrícula de exposição permanente do conteúdo, adicionar controle de liberação na turma e filtrar a Study API por esse gate sem afetar `/join`. Após estabilização, iniciar a auditoria de `LearningResource` que antecede `16.5 — Content Library & Reuse`.

Detalhes:
- [`ROADMAP_0_8.md`](ROADMAP_0_8.md)
- [`INCREMENT_16_3.md`](INCREMENT_16_3.md)
- [`INCREMENT_16_2.md`](INCREMENT_16_2.md)
- [`INCREMENT_16_1.md`](INCREMENT_16_1.md)
- [`INCREMENT_16_0.md`](INCREMENT_16_0.md)
