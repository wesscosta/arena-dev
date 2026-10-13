# Arena Dev v0.12 — Redesign e Active Learning | roadmap

**Estado:** planejamento aprovado para execução incremental; pilotos D12.2 em implementação/revisão na branch `feat/v012-ramuvi-pro-cards` ([issue #48](https://github.com/wesscosta/arena-dev/issues/48)); **não homologado, sem release**. [Evidências](v0.12/D12.2_PILOTS_IMPLEMENTATION.md). O lançamento da v0.11.0 ainda exige o GO operacional da 11.6.
**Figma:** [ARENA — Redesign UX v0.12 · Transportta](https://www.figma.com/design/gWMkarPwmeFY15jr0Tr6DN). A exploração é referência visual editável, **não** especificação funcional aprovada.

## 1. Objetivos e decisões preservadas

Evoluir a Arena Dev para uma plataforma educacional com identidade comercial madura, aplicável à educação profissional, concursos e outras áreas, sem estética de aposta/cassino nem excesso de gamificação. Priorizar a identidade candidata da Ramuvi (navy/verde-petróleo e ouro restrito), superfícies claras no trabalho e estudo, Arena com intensidade escura contextual, tipografia legível, ícones funcionais, navegação intuitiva e acessibilidade.

**Domínios preservados (ADR-0045):** Jornada = estudo sequencial; Atividades = fazer/entregar; Arena = interação ao vivo. Mostrar conteúdo não comprova aprendizagem, não pontua XP e não confirma Mastery.

Professores: Início, Turmas, Preparar aula, Biblioteca, Arena ao vivo, Dinâmicas, Projetor, Resultados. Alunos: Início, Jornadas, estudo, prática, revisão, Atividades, entrega, devolutiva e progresso. Projetor: leitura, questões, nuvem de palavras, timer, espera, desconexão e revogação.

## 2. Linha A — Design System e migração visual (prioridade de entrada)

| Etapa proposta | Entregáveis | Aceite necessário |
| --- | --- | --- |
| D12.0 — Auditoria | inventário de rotas/telas reais, estados e correspondência Figma ↔ React/Next; decisões preservar/refatorar/remover | não reconstruir por estética; identificar dívida e redundâncias |
| D12.1 — Design System | tokens semânticos, tipografia, responsividade, cores, alto contraste, componentes Figma com Auto Layout, Variants, propriedades, estados e equivalentes React | WCAG 2.2 AA projetada como mínimo, AAA quando viável; foco, zoom 200–400%, toque e teclado |
| D12.2 — Três telas-piloto | **Professor — Início; Professor — Arena ao vivo; Aluno — Jornada**, com estados, desktop/mobile e protótipos navegáveis | revisão visual, pedagógica, técnica e de acessibilidade antes de propagar padrões |
| D12.3 — Professor | turmas, preparação, Biblioteca, palco/dinâmicas, resultados | tarefas mais rápidas sem retirar timer, Grid/Spotlight, materiais, nuvem ou controles docentes |
| D12.4 — Aluno | continuidade do estudo, Jornada, Atividades/Entregas, revisão e progresso real | separar responsabilidades e não inventar indicadores de Mastery |
| D12.5 — Projetor | material longo, perguntas, tempo, espera, erro, reconexão, retirada e legibilidade em sala | projetor sem dados privados, HTML ativo ou indicadores individuais |
| D12.6 — Convergência | integração progressiva, design system em código, testes de regressão, performance, Safari/iOS e piloto | CI por SHA, rollback e aprovação docente |

**Não refazer todas as telas indiscriminadamente.** Evoluir o Figma existente preservando componentes úteis; não substituir frontends e APIs estáveis por uma maquete. Cada tela deve expressar seu objetivo real, evitando trocar apenas textos entre layouts genéricos.

**Estados obrigatórios:** normal, vazio, loading, erro, reconexão, ausência de permissão, disabled, hover, focus, sucesso e retomada. Responsividade em 320/360/390, 768, 1024, 1366/1440, ultrawide e projeção. Não exigir que um único layout do professor funcione sem adaptações no iPhone. O roteiro de aula é **opcional e flexível**, jamais um fluxo rígido que impeça improvisação.

Dados ilustrativos do Figma (alunos online, porcentagem concluída, média de acertos) não são métricas reais; cada indicador futuro exige fonte, denominador, período e significado pedagógico verificáveis.

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

**Próxima ação da v0.12:** auditar Figma e frontend e refinar profundamente as três telas-piloto e o Design System. O desenvolvimento Active Learning avançará depois de decisões explicitamente aprovadas, não em paralelo por padrão.

**Fontes:** [fechamento v0.11](v0.11/11.6_TECHNICAL_CLOSURE_NO_GO_2026-10-10.md), [roadmap v0.11](ROADMAP_V0_11.md), [handoff v0.9](HANDOFF_V0_9.md), [UX v0.10](v0.10/UX_FLOWS.md), [Design System](DESIGN_SYSTEM.md).
