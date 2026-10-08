# Estado atual — Arena Dev

**Última sincronização documental:** 8 de outubro de 2026

**Baseline publicada:** `v0.9.0 — Arena Learning Core`.

**Próxima linha planejada:** `v0.10 — Learning Loop`.

**Estado corrente:** v0.9.0 publicada e congelada; nenhum incremento funcional novo pertence a esta linha.

**Branch de release:** `main`.

**Handoff histórico da linha:** [`HANDOFF_V0_9.md`](HANDOFF_V0_9.md).

## Estado resumido

A v0.9.0 consolida o Learning Core até Flyway V48: LearningTarget, Interaction Core, Evaluation/Result, LearningEvidence, fluxo **Verificar aprendizagem**, trace AI-ready e shadow/cutover gate para Quiz, Poll e Word Cloud. A linha v0.9 está em feature freeze; novas capacidades seguem para v0.10.

A publicação da v0.9.0 não executa cutover automático. O legado continua autoritativo até que a amostra operacional real aprove `/api/learning-core/gate/cutover`; a remoção física permanece bloqueada até uma release posterior à janela de rollback.

A Journey já possui Study API própria, `/learn`, Reader, progresso e retomada, prévia do professor na mesma experiência, Builder reduzido a módulos + conteúdos e Progression UX com estados `COMPLETED`, `CURRENT` e `LOCKED`.

A frente de ingestão `16.3.8` cobre contrato normalizado, adapters Markdown/Text/Notion, Review UX, proveniência, fallback AI-ready, OAuth autorizado do Notion e seleção/importação de páginas pelo Journey Builder. O `16.4` consolidou o shell do aluno, separou matrícula de exposição persistente, integrou Live multi-turma e adicionou resgate de Journey por código.

## Baselines

```text
baseline publicada        v0.9.0 · Arena Learning Core
próxima linha             v0.10 · Learning Loop
estado                     feature freeze
branch                     main
schema                     Flyway V1–V48
cutover                    pendente de evidência operacional real
legado                     autoritativo durante a janela de rollback
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
- `/learn/achievements` possui Achievements Foundation persistente baseada em marcos reais de progresso, sem XP automático, moedas ou streaks;
- `16.4A — Student Workspace Visibility`: `studentStudyAccessEnabled` controla exposição persistente sem afetar Live e sem apagar progresso;
- `16.4B — Live dentro do Student Shell`: Live Hub descobre sessões ativas em todas as matrículas do aluno, oferece CTA contextual na Home e reutiliza `StudentJoinFlow`;
- `16.4C — Journey Discovery & Redemption`: professor gera/regenera/desativa código de Journey; aluno reconhecido resgata uma vez e mantém material/progresso no perfil, sem matrícula artificial;
- `16.4D — Achievements Foundation`: implementado tecnicamente; conquistas persistentes, avaliação idempotente e integração ao Student Experience.
- `Student Shell Style Guide v1`: referência visual/acessível criada; alvo AAA onde aplicável, com auditoria formal ainda pendente.

## 16.5 Content Library & Reuse — estado atual

- `LearningResource` foi evoluído como unidade reutilizável, sem criar um modelo paralelo de biblioteca;
- Library Core, workspace/reuse, refinamento editorial e snapshot hardening estão implementados até `16.5B.2`;
- materiais continuam preparados para nascer de Markdown, Notion, arquivo ou IA sem exposição automática ao aluno;
- `16.5C — Semantic Content Foundation & Ingestion → Library`: **concluído tecnicamente** com metadata editorial, V38, CanonicalDocument transitório, canonicalizer determinístico, outline H1–H6, ingestão revisável e Leitura/Estrutura/Mapa;
- `16.5D — Organization & Discovery`: **fechado no escopo v0.8** com busca, filtros combináveis, facets e ordenação; paginação só entra com necessidade real;
- `16.5E — Revision Awareness`: **concluído** com revisão corrente x snapshot e refresh explícito somente para Journey em rascunho;
- `16.5F — Library Closure`: **fechado no escopo v0.8** com exportação Markdown, archive/restore e reuso sem duplicar a fonte canônica.

## Semantic Library — implementação corrente

- V38 adiciona `subject`, `language`, `content_sha256`, outline derivado/versionado e tags em relação própria;
- metadata editorial não é Knowledge Taxonomy e mudanças apenas em assunto/tags/idioma não avançam a revisão de conteúdo;
- `CanonicalDocument` é transitório; `LearningResource` continua fonte durável depois da materialização;
- `ContentCanonicalizer` normaliza entrada, calcula hash SHA-256 e produz árvore H1–H6 determinística ignorando headings em code fences;
- ingestão global da Biblioteca suporta Markdown, texto, arquivo, Notion e URL com preview/review antes da persistência;
- fontes sem estrutura confiável são sinalizadas para revisão; IA permanece fallback opcional, não requisito;
- cada recurso oferece **Leitura | Estrutura | Mapa** sobre a mesma revisão, sem entidade `MindMap` paralela;
- busca/filtros incluem assunto, tags e idioma;
- uso em Journey mostra snapshot x revisão corrente e só permite refresh explícito em Journey `DRAFT`;
- exportação `.md` inicia a garantia de portabilidade;
- edição do nome do aluno reutiliza `Enrollment.preferredName`: a UI agora explicita **Nome na turma · Editar**, sem alterar `Student.fullName`.

Contrato: [`CONTENT_CANONICAL_MARKDOWN.md`](CONTENT_CANONICAL_MARKDOWN.md). Plano/registro: [`INCREMENT_16_5C_PLAN.md`](INCREMENT_16_5C_PLAN.md).

## UX transversal — shell e participantes

- páginas administrativas voltaram a crescer conforme o conteúdo, com scroll natural do documento;
- confinamento `100dvh`/`overflow: hidden` ficou restrito à Arena ao vivo via `arena-fullscreen-shell`;
- scroll lock de overlays centralizado e seguro para locks simultâneos;
- tela de participantes simplificada com busca, nome de exibição sob demanda e ações por ícones;
- polish final da Arena: scrollbar visual da sidebar oculto sem perder rolagem, roster escasso alinhado ao topo e card de perfil com contenção de texto sem colisão com avatar;
- baseline atual: Next.js 16.3.8; `npm audit --omit=dev --audit-level=high` com 0 vulnerabilidades de produção; frontend 300/300, lint/format/typecheck/build verdes; backend 163 testes unitários + 109 integrações;
- transporte HTTP frontend consolidado em `lib/http/client.ts`; módulos de domínio não implementam mais parsing/CSRF/credentials de forma independente;
- direção de dependência CSS corrigida: componentes não importam mais módulos de estilo privados de `app/`; Projector, Student Join e Study possuem ownership de feature em `components/`;

## Turmas — consolidação MVP

- o shell do professor continua sem sidebar; `Turmas` é o nível global do sistema e substitui o rótulo ambíguo `Visão geral`;
- `Biblioteca` passou a destino explícito da navegação global no topbar, em vez de CTA isolado da página;
- a página `Suas turmas` mantém busca por nome/código, filtros Ativas/Inativas e ordenação por MRU/nome/código;
- grid de turmas consolidado em até cinco colunas fluidas no desktop/ultrawide, preenchendo a largura útil sem criar uma sexta coluna; cards mantêm hierarquia interna à esquerda e seleção com barra vertical estável; sem carrossel, categorias, tags ou progresso inventado;
- XP saiu do card de descoberta; o card mostra somente código, alunos, atividades e estado operacional;
- light/dark usam os tokens semânticos existentes e a matriz E2E cobre reload em 390, 768, 1024, 1440, 1920 e 2560 px;
- categorias, shelves estilo Netflix, favoritos e taxonomias adicionais continuam fora do MVP até existir necessidade observada.

Documento: [`CLASSROOM_OVERVIEW_MVP_CONSOLIDATION.md`](CLASSROOM_OVERVIEW_MVP_CONSOLIDATION.md).

## Professor Arena Experience — implementado

- shell estrutural extraído em `ArenaLiveShell`, `ArenaSidebar` e `ArenaSessionHeader`;
- `ArenaContextRail`, configurações do sorteio e realtime da Arena possuem boundaries próprios; `useArenaRealtime` concentra Join Code + WebSocket + estados Buzzer/Timer/Word Cloud/Poll/Quiz/Ranking;
- header restrito ao workspace, sem compensações negativas de largura/margem;
- E2E do shell verde em 1366×768, 1440×900, 1536×864 e 1920×1080, mais cenário com 22 participantes em 1821×831; sem overflow horizontal/vertical estrutural, com Ações rápidas e código/QR dentro da viewport;
- seleção balanceada extraída para `ParticipantSelectionService`, mantendo o backend como autoridade;
- Grid + Spotlight transitório implementado como experiência padrão do Sorteio;
- `useParticipantSelection` concentra a orquestração da seleção no frontend sem escolher vencedor;
- Grid representa disponível, ausente, já sorteado e selecionado agora;
- Spotlight aparece apenas no reveal, sem simulação de nomes, roleta falsa ou slot-machine;
- rail do Sorteio mostra resumo da sessão e histórico persistido em vez de duplicar o roster;
- `DRAW_COMPLETED` registra `method=BALANCED` e `drawCount`;
- Grid + Spotlight continua como apresentação padrão, mas a Roleta agora é uma apresentação alternativa real em `WheelParticipantSelector`;
- a apresentação (`GRID_SPOTLIGHT` ou `WHEEL`) é persistida por sessão no estado `QUICK_DRAW`, sem nova migration e sem alterar o algoritmo balanceado;
- drawer separa explicitamente Critério de Seleção, Apresentação e Regras da Seleção;
- Grid limita os cards a 13.5rem no desktop, evitando expansão excessiva em turmas pequenas;
- `NEXT_PUBLIC_ARENA_SELECTOR_MODE` permanece somente como fallback de compatibilidade/default frontend;
- E2E do selector: 8/8, incluindo reveal → retorno ao Grid, alternância Grid ↔ Roleta, persistência da apresentação, cards compactos, 22 participantes e quatro viewports do shell;
- tabs antigas removidas da Arena;
- sidebar persistente por ação;
- Dinâmicas e Ferramentas separadas;
- header operacional de sessão;
- Arena full-width em desktop;
- QR/código de sessão preservado no rail;
- Timer, Organização e Presença como ferramentas contextuais;
- Timer refinado para uma única superfície de configuração: títulos auxiliares redundantes removidos, oito presets em uma linha sem scroll horizontal, Exibição/Alertas compactados e baseline 1366×768 validada sem scroll vertical obrigatório;
- Pontuação Rápida transversal;
- Ranking da sessão implementado como ferramenta contextual, derivado exclusivamente de `ScoreEvent` com `sessionId`, com competition ranking para empates e sem score paralelo;
- Ranking permanece privado por padrão; `Top 5`/`Todos`, projeção explícita, anonimização no backend e atualização realtime estão disponíveis;
- estado público do Ranking é separado do estado privado do professor e não é exposto ao participante; ocultar a projeção restaura o `LiveStage` que já estava ativo;
- o Ranking é feedback operacional da aula e não representa Mastery, desempenho acadêmico global ou leaderboard persistente;
- navegação compacta mobile da Arena recebeu contenção horizontal e nomes acessíveis explícitos durante a matriz responsiva do Ranking;
- Configurações exibem apenas regras reais e permitem trocar a apresentação sem alterar o critério de seleção;
- QR ampliável em Presença e acesso;
- indicadores de online e presença consolidados no roster;
- selects nativos com contraste dark consistente;
- Quiz, Votação, Nuvem de Palavras, Buzzer e Boss Battle em workspace de altura integral no desktop;
- handshake WebSocket público serializado: participante/projetor recebem o `RUNTIME_SNAPSHOT` inicial de forma ordenada antes do `AUTH_OK`, protegendo a hidratação contra eventos concorrentes logo após o registro.

## Fechamentos anteriores

- `16.0` concluído e mergeado no PR #21;
- `16.1` concluído e mergeado no PR #22.

## Validação corrente

```text
backend unit         OK · 163/163
backend integration  OK · 109/109
frontend tests       OK · 300/300
frontend lint/format OK
frontend typecheck   OK
frontend build       OK
Compose isolado      OK
Chromium E2E         OK · 23/23
backup/restore       OK · PostgreSQL 17
Flyway               V1–V48
```

## Gate atual — v0.9.0 congelada

O release hardening da v0.9.0 foi concluído com gate local completo, backup/restore V48 e CI verde no mesmo SHA antes da tag. A linha está em **feature freeze**.

O único gate ainda aberto é operacional e posterior à publicação: coletar a amostra real de shadow validation para autorizar o cutover lógico. Até lá, o legado permanece autoritativo e removível apenas após uma release posterior atravessar a janela de rollback.

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

## Fechamento corrente da v0.8

O Gate de Estabilização Arquitetural foi integrado e `16.5C–F` estão tecnicamente fechados. A linha corrente é **Release Hardening**; qualquer capacidade funcional nova deve ser movida para a próxima versão.

`16.6 — Knowledge & Retrieval Foundation` é evolução pós-v0.8/opcional para chunks derivados, lexical/vector retrieval, embeddings, avaliação e futuro RAG/LLM. Não faz parte do gate de release v0.8.

O plano pedagógico seguinte foi renumerado para evitar colisão com 16.6: `17.0` audita o modelo de evidência; `17.1` cria Knowledge Taxonomy; `17.2` roadmaps/editais; `17.3` Question Bank & Provenance; `17.4` Assessment Blueprint & Mastery; `17.5` Review & Retention; `17.6` dashboard docente; `17.7` progressão/avatar; `17.8` recomendações adaptativas. A regra é explícita: progresso de leitura, clique em Próximo e uma questão isolada não validam domínio. Documento: [`LEARNING_VALIDATION_ROADMAP.md`](LEARNING_VALIDATION_ROADMAP.md).

### 16.5B.2 — Journey Snapshot Integrity Hardening — implementado

A materialização Biblioteca → Journey agora é explícita: updates comuns preservam a revisão já copiada, inclusive quando a origem foi posteriormente editada ou arquivada. `JourneyStage.updateConfiguration()` não toca no snapshot; `materializeResource()` é a fronteira de escrita. O 16.5E concluiu a atualização explícita entre revisões apenas em Journey `DRAFT`.
