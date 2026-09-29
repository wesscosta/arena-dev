# Estado atual — Arena Dev

**Última sincronização documental:** 28 de setembro de 2026

**Baseline publicada:** `v0.7.0 — Educational Integrations`.

**Linha ativa:** `v0.8 — Professor Experience & Journey MVP`.

**Incremento atual:** `16.4 — Student Experience Shell & Workspace Visibility`, com 16.4A–C implementados tecnicamente e gate visual integrado pendente.

**Branch ativa:** `feat/v0.8-content-ingestion`.

## Estado resumido

A v0.7.0 está encerrada e publicada. `16.0` e `16.1` foram integrados à `main`; a branch ativa acumula 16.2, o fechamento técnico do 16.3 e a implementação de 16.4A–C.

A Journey já possui Study API própria, `/learn`, Reader, progresso e retomada, prévia do professor na mesma experiência, Builder reduzido a módulos + conteúdos e Progression UX com estados `COMPLETED`, `CURRENT` e `LOCKED`.

A frente de ingestão `16.3.8` cobre contrato normalizado, adapters Markdown/Text/Notion, Review UX, proveniência, fallback AI-ready, OAuth autorizado do Notion e seleção/importação de páginas pelo Journey Builder. O `16.4` consolidou o shell do aluno, separou matrícula de exposição persistente, integrou Live multi-turma e adicionou resgate de Journey por código.

## Baselines

```text
baseline publicada        v0.7.0
linha ativa               v0.8
último integrado à main   16.1 · PR #22
incremento atual           16.4 · Student Experience Shell & Workspace Visibility
fatia atual                16.4A–C · implementadas tecnicamente; gate visual integrado pendente
branch                     feat/v0.8-content-ingestion
schema                     Flyway V1–V35
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
- `16.4A — Student Workspace Visibility`: `studentStudyAccessEnabled` controla exposição persistente sem afetar Live e sem apagar progresso;
- `16.4B — Live dentro do Student Shell`: Live Hub descobre sessões ativas em todas as matrículas do aluno, oferece CTA contextual na Home e reutiliza `StudentJoinFlow`;
- `16.4C — Journey Discovery & Redemption`: professor gera/regenera/desativa código de Journey; aluno reconhecido resgata uma vez e mantém material/progresso no perfil, sem matrícula artificial;
- `16.4D — Achievements Foundation`: implementado tecnicamente; conquistas persistentes, avaliação idempotente e integração ao Student Experience.
- `Student Shell Style Guide v1`: referência visual/acessível criada; alvo AAA onde aplicável, com auditoria formal ainda pendente.

## Marcador de roadmap — 16.5 Content Library & Reuse

- biblioteca futura será construída sobre auditoria/evolução de `LearningResource`, evitando um segundo modelo paralelo de conteúdo;
- materiais poderão nascer de Markdown, Notion, arquivo ou IA e ser reutilizados em Journey/Activity/Arena;
- o acervo do professor não será automaticamente visível ao aluno;
- primeiro gate: fechar a validação visual integrada do `16.4A–C`; depois auditar ownership, metadados, dependências, ciclo de vida e semântica de reuso/snapshot.

## UX transversal — shell e participantes

- páginas administrativas voltaram a crescer conforme o conteúdo, com scroll natural do documento;
- confinamento `100dvh`/`overflow: hidden` ficou restrito à Arena ao vivo via `arena-fullscreen-shell`;
- scroll lock de overlays centralizado e seguro para locks simultâneos;
- tela de participantes simplificada com busca, nome de exibição sob demanda e ações por ícones;
- regressão transversal atual validada com 268 testes de frontend, typecheck e build de produção;

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
backend tests        OK (suíte Maven completa)
frontend tests       268 passed
frontend typecheck   OK
frontend build       OK
git diff --check     OK
Flyway               V1–V35
```

## Próximo gate

Validar visualmente o conjunto `16.4A–C` em desktop/mobile, incluindo Workspace Visibility, Live Hub, regressão de `/join`/Arena e resgate de Journey por código. Com esse gate fechado, iniciar a auditoria de `LearningResource` que abre o `16.5 — Content Library & Reuse`.

Detalhes:
- [`ROADMAP_0_8.md`](ROADMAP_0_8.md)
- [`INCREMENT_16_4A.md`](INCREMENT_16_4A.md)
- [`INCREMENT_16_4B.md`](INCREMENT_16_4B.md)
- [`INCREMENT_16_4C.md`](INCREMENT_16_4C.md)
- [`INCREMENT_16_3.md`](INCREMENT_16_3.md)
- [`INCREMENT_16_2.md`](INCREMENT_16_2.md)
- [`INCREMENT_16_1.md`](INCREMENT_16_1.md)
- [`INCREMENT_16_0.md`](INCREMENT_16_0.md)

## Checkpoint de fechamento — Student Experience 16.4

**28/09/2026:** o ciclo funcional/visual `16.4A–16.4C` foi fechado como checkpoint. O Student Shell agora consolida Home, Jornadas, Reader e Live; Journey usa timeline/progresso sequencial, retomada e capítulos recolhíveis; o zoom global da área de estudos vai de 80% a 200% e não escala o chrome da aplicação; iconografia funcional foi normalizada em SVG; descrições técnicas de ingestão são filtradas da experiência do aluno.

No gate histórico desse fechamento, a suíte backend completa, **271/271 testes frontend**, typecheck, build de produção e `git diff --check` passaram. O fechamento não declara conformidade WCAG AAA nem release v0.8. Desde então, 16.4D e a base de 16.5 até 16.5B.2 foram implementados. Permanecem para o release hardening a auditoria manual de acessibilidade, validação visual final mobile/ultrawide, consolidação de `study.module.css`, E2E e gates de release/restore.

Documento de fechamento: [`CLOSURE_16_4_STUDENT_EXPERIENCE.md`](CLOSURE_16_4_STUDENT_EXPERIENCE.md).

## 16.4D — Achievements Foundation concluído

**28/09/2026:** a área Conquistas deixou de ser placeholder. O backend persiste marcos no Student com V36 e AchievementService; o catálogo inicial reconhece primeiro conteúdo, primeiro capítulo materializado e primeira Journey. A avaliação cobre progresso por matrícula e redemption, é idempotente e reconcilia progresso preexistente. O frontend /learn/achievements usa lista editorial e o Reader comunica novos unlocks de forma não bloqueante.

Com **16.4A–16.4D implementados, 16.4 — Student Experience Shell & Workspace Visibility está tecnicamente concluído**. Permanecem fora do fechamento funcional: auditoria manual de acessibilidade, E2E/hardening de release e consolidação posterior do CSS. A próxima linha funcional é **16.5 — Content Library & Reuse**.

## 16.5.0 — Architecture Audit concluído

**28/09/2026:** o 16.5 foi cruzado com o código real antes de qualquer migration. LearningResource já é a entidade de conteúdo e será a base da Biblioteca. Hoje, porém, ele é obrigatório por turma e é referenciado de forma viva por JourneyStage; editar o recurso pode alterar a Journey. A autenticação do professor ainda não fornece identidade persistente para ownerTeacherId.

Decisão: nenhuma V37 será criada antes de definir o desacoplamento Library Resource → Journey Snapshot e uma estratégia de ownership/migração que preserve os dados V29–V32. Documento: docs/INCREMENT_16_5_0_ARCHITECTURE_AUDIT.md.

## 16.5A — Library Core implementado

**28/09/2026:** V37 e o núcleo de Biblioteca foram implementados. LearningResource continua como entidade canônica; recursos da Biblioteca podem ser reutilizados entre turmas e JourneyStage passa a manter snapshot de conteúdo/revisão. Atualizações posteriores na Biblioteca não alteram a Journey já materializada. UI completa, tags/busca e ingestão direta para Biblioteca permanecem fora deste incremento.

## 16.5B — Library Workspace & Reuse implementado

**28/09/2026:** o professor já possui Biblioteca global utilizável: criar, buscar, abrir, editar, arquivar/restaurar e adicionar materiais a Journeys em rascunho. O Journey Builder também seleciona materiais da Biblioteca. O snapshot continua centralizado no domínio da Journey. Próxima linha: **16.5C — Ingestion → Library**.

## 16.5B.1 — refinamento da Biblioteca

**28/09/2026:** autoria Markdown passou a aproveitar a largura útil e ganhou preview renderizado; desktop usa edição + preview lado a lado e telas menores alternam as superfícies. O plano semântico/RAG permanece documentado para 16.5C e não foi implementado.

## Sequência corrente após 16.5B.1

O próximo incremento funcional é `16.5C — Semantic Content Foundation & Ingestion → Library`. O fechamento da Biblioteca seguirá, em ordem, por `16.5D — Organization & Discovery`, `16.5E — Revision Awareness & Snapshot Hardening` e `16.5F — Advanced Reuse & Library Closure`. Depois disso, a v0.8 entra em Release Hardening transversal; não deve abrir outro domínio funcional automaticamente.

`16.6 — Knowledge & Retrieval Foundation` é evolução pós-v0.8/opcional para chunks derivados, lexical/vector retrieval, embeddings, avaliação e futuro RAG/LLM. Não faz parte do gate de release v0.8.

### 16.5B.2 — Journey Snapshot Integrity Hardening — implementado

A materialização Biblioteca → Journey agora é explícita: updates comuns preservam a revisão já copiada, inclusive quando a origem foi posteriormente editada ou arquivada. `JourneyStage.updateConfiguration()` não toca no snapshot; `materializeResource()` é a fronteira de escrita. O 16.5E continua responsável pela futura atualização explícita entre revisões.
