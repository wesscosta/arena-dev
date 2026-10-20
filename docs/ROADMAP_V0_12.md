# Arena Dev v0.12 — Redesign e Active Learning | roadmap

**Estado (20/10/2026):** em **auditoria e design Figma-first**, com [issue #48 de acompanhamento](https://github.com/wesscosta/arena-dev/issues/48); não implementado, não homologado. A v0.11 está na pré-release `v0.11.0-rc.7`; a `0.11.0` ainda exige o GO operacional da 11.6.
**Fonte de verdade:** as decisões de produto e design da v0.12 vivem no Notion ([auditoria Figma-first e gate de implementação](https://app.notion.com/p/3f9f3eb198c38136b319e5807170f8bf)); este arquivo resume o que afeta o repositório.
**Figma:** [ARENA — Redesign UX v0.12 · Transportta](https://www.figma.com/design/gWMkarPwmeFY15jr0Tr6DN). A exploração é referência visual editável, **não** especificação funcional aprovada.

## 0. Gate Figma-first (decisão de 14/10/2026)

A v0.12 é conduzida como **auditoria e design no Figma primeiro**. O código da v0.12 parte da baseline **`v0.11.0-rc.7`** e não recebe mudanças da v0.12 até aprovação explícita do Design System e dos três pilotos. A 11.7 corrigiu defeitos contra o Design System atual (tokens de papel, controles de 44px, contraste AAA de texto); não é a nova linguagem visual e serve de ponto de partida para a migração.

**Processo:** Figma → revisão de UX/UI → protótipo → aceite explícito → código → testes.

- Não refatorar JSX/CSS, não adicionar camada visual ao legado, não implementar telas nem alterar tokens no produto antes do aceite. O mesmo vale para migrations, APIs e mudanças de domínio da v0.12.
- O [PR #54](https://github.com/wesscosta/arena-dev/pull/54) (`feat/v012-ramuvi-pro-cards`, `bc49dda`) foi **descartado como implementação**. Não mesclar; arquivar ou encerrar só depois de preservar a referência para recuperação seletiva.
- Fases do ciclo de design no Notion: **A0** inventário e diagnóstico, **A1** identidade e Design System, **A2** três pilotos, **A3** cobertura integral das telas, **A4** gate de aprovação antes do código (decisões `APROVADO / AJUSTAR / REJEITADO`).
- **Bloqueio atual:** o inventário completo do Figma depende de acesso além do limite da integração Figma Starter. Só os frames `P · Início docente` e `P · Minhas turmas` tiveram leitura estrutural parcial.

## 1. Objetivos e decisões preservadas

Evoluir a Arena Dev para uma plataforma educacional com identidade comercial madura, aplicável à educação profissional, concursos e outras áreas, sem estética de aposta/cassino nem excesso de gamificação. Priorizar verde institucional, superfícies claras, tipografia legível, ícones funcionais, espaçamento coerente, navegação intuitiva e acessibilidade.

**Domínios preservados (ADR-0045):** Jornada = estudo sequencial; Atividades = fazer/entregar; Arena = interação ao vivo. Mostrar conteúdo não comprova aprendizagem, não pontua XP e não confirma Mastery.

Professores: Início, Turmas, Preparar aula, Biblioteca, Arena ao vivo, Dinâmicas, Projetor, Resultados. Alunos: Início, Jornadas, estudo, prática, revisão, Atividades, entrega, devolutiva e progresso. Projetor: leitura, questões, nuvem de palavras, timer, espera, desconexão e revogação.

## 2. Linha A — Design System e migração visual (prioridade de entrada)

| Etapa proposta | Entregáveis | Aceite necessário |
| --- | --- | --- |
| D12.0 — Auditoria | inventário de rotas/telas reais, estados e correspondência Figma ↔ React/Next; decisões preservar/refatorar/remover | não reconstruir por estética; identificar dívida e redundâncias |
| D12.1 — Design System | tokens semânticos, tipografia, responsividade, cores, alto contraste, componentes Figma com Auto Layout, Variants, propriedades, estados e equivalentes React | WCAG 2.2 AA projetada como mínimo, AAA quando viável; foco, zoom 200–400%, toque e teclado |
| D12.2 — Três telas-piloto | **Professor — Início docente; Aluno — Jornada (mapa e linha do tempo); Arena/Projetor**, com estados, desktop/tablet/mobile e protótipos navegáveis no Figma | revisão visual, pedagógica, técnica e de acessibilidade antes de propagar padrões |
| D12.3 — Professor | turmas, preparação, Biblioteca, palco/dinâmicas, resultados | tarefas mais rápidas sem retirar timer, Grid/Spotlight, materiais, nuvem ou controles docentes |
| D12.4 — Aluno | continuidade do estudo, Jornada, Atividades/Entregas, revisão e progresso real | separar responsabilidades e não inventar indicadores de Mastery |
| D12.5 — Projetor | material longo, perguntas, tempo, espera, erro, reconexão, retirada e legibilidade em sala | projetor sem dados privados, HTML ativo ou indicadores individuais |
| D12.6 — Convergência | integração progressiva, design system em código, testes de regressão, performance, Safari/iOS e piloto | CI por SHA, rollback e aprovação docente |

**Não refazer todas as telas indiscriminadamente.** Evoluir o Figma existente preservando componentes úteis; não substituir frontends e APIs estáveis por uma maquete. Cada tela deve expressar seu objetivo real, evitando trocar apenas textos entre layouts genéricos.

**Estados obrigatórios:** normal, vazio, loading, erro, reconexão, ausência de permissão, disabled, hover, focus, sucesso e retomada. Responsividade em 320/360/390, 768, 1024, 1366/1440, ultrawide e projeção. Não exigir que um único layout do professor funcione sem adaptações no iPhone. O roteiro de aula é **opcional e flexível**, jamais um fluxo rígido que impeça improvisação.

Dados ilustrativos do Figma (alunos online, porcentagem concluída, média de acertos) não são métricas reais; cada indicador futuro exige fonte, denominador, período e significado pedagógico verificáveis.

## 2.1 Requisitos de design já decididos para a Jornada

Ambos estão aprovados **para prototipação**, não para código. Entram nos pilotos Professor e Jornada e seguem o gate da seção 0.

### Jornada do Aluno em mapa panorâmico e linha do tempo (14/10/2026)

Duas visualizações do **mesmo percurso curricular**, com os mesmos dados, estados e ações. Não duplicar Jornadas nem modelos de progresso. [Especificação no Notion](https://app.notion.com/p/3f9f3eb198c3816d9e12d12d97cd17f9).

| Visualização | Comportamento esperado | Guardrails |
| --- | --- | --- |
| **Mapa panorâmico horizontal** | trilha contínua de nós por etapa; no desktop, rolagem vertical convertida em deslocamento horizontal só dentro de uma área delimitada, liberando a página nos limites; parallax moderado só em planos decorativos | sem scroll-jacking global; `prefers-reduced-motion` e variante sem efeitos; anterior/próximo, acesso direto à etapa, indicador de posição, voltar à etapa atual e sair da exploração; no mobile, gesto horizontal só no mapa |
| **Linha do tempo vertical** | mesma ordem e estados em lista, agrupada por UC/capítulo; visualização inicial sugerida no mobile | funcional sem mapa e sem animação; melhor densidade, leitura longa e acessibilidade |
| **Detalhe da etapa** | foco em **Continuar meus estudos**, objetivos do PTD revisado, conteúdos da Biblioteca, Atividades vinculadas e devolutivas autorizadas | sem percentuais sem numerador, denominador e regra; cadeado só para pré-requisito pedagógico real |

Origem prevista: Plano de Curso + PTD → extração assistida → revisão docente → prévia → publicação versionada. Progresso de estudo, evidência de competência e XP permanecem indicadores separados. A Jornada contextual da turma não antecipa roadmaps reutilizáveis, KnowledgeNode ou Mastery.

**Aceite antes de implementar:** mapa e timeline em alta fidelidade (desktop/tablet/mobile) com protótipo navegável; demonstração de entrada e saída da área de scroll com mouse, touchpad e teclado; variantes sem movimento; contraste, zoom 200–400%, reflow e leitor de tela; simulação com PTD real sem inventar APIs.

### D12-JR-CODE-01 — Restrições de cópia em blocos de código da Jornada (16/10/2026)

**Estado:** requisito incluído no escopo de design. Não implementado, não testado, não homologado. [Requisito completo no Notion](https://app.notion.com/p/3f9f3eb198c38136b319e5807170f8bf).

- **Onde o professor configura:** Professor → Jornada → Editar Jornada → Configurações → **Leitura e código**, durante revisão/prévia e antes da publicação.
- **Dois toggles independentes, desligados por padrão (opt-in docente):** (A) restringir o menu do botão direito nos blocos de código; (B) bloquear cópia por `Ctrl+C`/`Cmd+C` e evento `copy` de seleção dentro de código.
- **Escopo:** política única **por Jornada** na v0.12 mínima. Não é preferência do aluno nem altera o Markdown ou o recurso canônico da Biblioteca. Vale para o Reader a partir do snapshot publicado, chegando pelo Mapa ou pela Timeline.
- **Não afeta:** texto comum, `input`, `textarea`, atividades, edição docente, seleção, foco, teclado, leitores de tela, `Ctrl+V`, impressão. Nenhuma interceptação global de `keydown`, `copy` ou `contextmenu`; o evento e a seleção precisam pertencer ao bloco `pre/code`.
- **Limite declarado:** controle didático de interface, não DRM nem antifraude. Sem registro de tentativas, pontuação, punição ou coleta de dados.
- **Contrato a validar:** dois booleanos na configuração existente da Jornada (nomes ilustrativos, como `codeBlockContextMenuRestricted` e `codeBlockClipboardCopyRestricted`); alteração autorizada só ao professor responsável e política enviada pelo backend no estado publicado.
- **Aceite:** Figma com as quatro combinações dos toggles e estados de salvamento/erro/permissão; testes automatizados das quatro combinações; E2E desktop/mobile com mouse, teclado, macOS e Windows/Linux; regressão do Reader sem restrições.
- **Piloto previsto:** UC 05 — Desenvolvimento Desktop / Projeto 01 Registro de Visitantes, convertido para Markdown canônico importável.

## 3. Linha B — Active Learning já previsto anteriormente

O [handoff v0.9](HANDOFF_V0_9.md) definiu a direção **v0.12 — Active Learning**, que deve ser mantida no planejamento:

| Capacidade candidata acordada | Guardrail pedagógico/técnico |
| --- | --- |
| **Missions** | missão contextualizada com objetivo, evidência e rubrica; não mera animação/XP |
| **Group submissions** | entrega coletiva com autoria, permissão e rastreabilidade de contribuição |
| **Student-created questions** | questões produzidas por alunos, sujeitas a curadoria/revisão docente |
| **Explanation required** | justificar respostas quando a rubrica e a acessibilidade tornarem isso útil |
| **Advanced recovery rounds** | retomar um instrumento após intervenção, com evidência comparável e idempotência |
| **Rich response types** | novos formatos de resposta condicionados a avaliadores e objetivos validados |

**Preservar esses seis eixos no roadmap não significa implementá-los todos na v0.12.** Suas fatias dependem de priorização, entrevistas, arquitetura, revisão de conteúdo e piloto. Não criar tabelas/APIs de avaliação sem essa decisão.

## 4. Itens antes adiados — discovery separado, não compromisso automático da v0.12

- **Group by Response e Meta Coletiva:** exigir ganho pedagógico e consentimento; evitar dinâmica de pontuação estilo bets/boss.
- **Canva e HTML incorporado:** comparar com link HTTPS seguro e retorno à Arena; iframe somente após ganho comprovado, CSP e isolamento.
- **Questões para concursos, editais e simulados:** partir do [discovery 11.5](v0.11/11.5_DECISIONS_AND_BACKLOG.md) e da [ADR-0068 proposta](adr/ADR-0068-editorial-provenance-taxonomy-proposal.md); revisão jurídico-editorial e docente antes de catálogo/importação.
- **IA avançada, RAG, Mastery longitudinal:** dependem de evidência, identidade, retenção, privacidade e revisão humana; não inferir domínio de exposição/progresso.
- **Multi-tenant/SaaS:** requer arquitetura de autorização/isolamento própria, não apenas telas novas.

As alternativas podem ser reavaliadas e rejeitadas por falta de benefício. Não promover decisões experimentais a funcionalidades prontas.

## 5. Definition of Done da nova experiência

1. Matriz Figma ↔ rota ↔ componente ↔ API ↔ estado ↔ ator auditada.
2. Design System real (tokens, componentes reutilizáveis, Auto Layout/Variants, estados), tipografia legível, contraste aferido e sem scroll preso.
3. Três telas-piloto aprovadas antes de replicar padrões para outras telas.
4. Testes desktop/tablet/mobile, teclado, zoom, Safari/iOS e leitores de tela; nenhum botão decorativo sem ação.
5. Mesmos contratos de sessão, idempotência, snapshot público seguro, revogação e controles docentes.
6. Métricas com interpretação correta; evitar números demonstrativos apresentados como dados reais.
7. Histórico de alterações visuais, CI regressivo, aceite pedagógico e plano de rollback.
8. Escopo da v0.11 preservado sem novas funcionalidades nessa release.

**Insumo da auditoria de 19/10/2026** ([Notion](https://app.notion.com/p/3fef3eb198c381148bdcf38b4cdee1ab)): estado na URL e decomposição do `ArenaApp` junto das telas piloto; SPI de mecânicas ao vivo; tokens em 3 camadas com lint bloqueando literais; identidade clara sem neon e fonte auto-hospedada; presets de gamificação por sessão e metas coletivas; "você foi chamado(a)" só para o sorteado; migrar testes de regex para comportamento.

**Próxima ação da v0.12:** obter acesso ao Figma suficiente para o inventário completo (A0), depois validar identidade, Design System e os três pilotos, incluindo Jornada em mapa e linha do tempo e D12-JR-CODE-01. O gate de código permanece fechado. O desenvolvimento Active Learning avançará depois de decisões explicitamente aprovadas, não em paralelo por padrão.

**Fontes:** Notion: [auditoria Figma-first e gate](https://app.notion.com/p/3f9f3eb198c38136b319e5807170f8bf), [Jornada PTD: mapa, parallax e timeline](https://app.notion.com/p/3f9f3eb198c3816d9e12d12d97cd17f9), [Design System e handoff Figma-first](https://app.notion.com/p/3f9f3eb198c38141b995d80952c1bc79). Repositório: [fechamento v0.11](v0.11/11.6_TECHNICAL_CLOSURE_NO_GO_2026-10-10.md), [roadmap v0.11](ROADMAP_V0_11.md), [handoff v0.9](HANDOFF_V0_9.md), [UX v0.10](v0.10/UX_FLOWS.md), [Design System](DESIGN_SYSTEM.md).
