# Gate de Estabilização Arquitetural — v0.8

**Status:** planejado · bloqueador para novos incrementos funcionais relevantes  
**Escopo:** frontend, backend, testes, segurança, documentação e linguagem visual  
**Data da auditoria:** 30/09/2026  
**Linha:** v0.8 — Professor Experience & Journey MVP

## 1. Objetivo

Interromper temporariamente a expansão funcional para reduzir dívida estrutural que já está causando regressões de layout, fragilidade de testes, acoplamento entre módulos e divergência entre o Design System documentado e a implementação real.

Este gate não é uma reescrita. O objetivo é estabilizar o monólito modular atual, preservar o comportamento validado e criar fronteiras claras para que os próximos incrementos — incluindo Participant Selector / Spotlight + Grid e 16.5C — sejam construídos sobre uma base previsível.

A sequência passa a ser:

```text
baseline atual
   ↓
P0 Segurança + baseline confiável
   ↓
P1 Arena Live Shell + frontend boundaries
   ↓
P2 Design System e CSS ownership
   ↓
P3 Backend modularity / SOLID pragmático
   ↓
P4 Test strategy e quality gates
   ↓
P5 Participant Selector / Spotlight + Grid
   ↓
retomada de 16.5C e demais incrementos
```

## 2. Evidências da auditoria

### 2.1 Gates executados

| Gate | Resultado observado |
| --- | --- |
| Frontend typecheck | OK |
| Frontend unit/source tests | 274/274 |
| Backend unit tests | 106/106 |
| Backend `mvn verify` | BUILD SUCCESS · 106 unitários + 87 ITs |
| Flyway | V1–V37 aplicado com sucesso nos ITs |
| Frontend build | OK com Next.js 16.3.8 |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilidades |
| E2E críticos | 4/4 |
| E2E Arena shell + selector | 8/8 · 4 viewports + 22 participantes + Grid↔Roleta + cards compactos |

A baseline P0 foi restaurada. O teste estrutural obsoleto da navegação foi substituído por assertions alinhadas ao contrato atual do shell, sem reintroduzir o bloco redundante removido.

### 2.2 Frontend

- `ArenaApp.tsx`: 4.563 linhas após a extração do chrome estrutural;
- `ArenaLiveChrome.tsx`: 229 linhas, owner de shell/sidebar/header da Arena;
- `ArenaView` ainda concentra estado, efeitos, WebSocket, comandos, participantes, dinâmicas e pontuação;
- 48 `useState` e 20 `useEffect` permaneciam no diagnóstico inicial e serão recontados após P1;
- `arena-polish.css`: 4.857 linhas;
- `globals.css`: ~3.280 linhas;
- 104 usos de `!important`;
- centenas de cores literais fora dos tokens;
- ampla dependência de aliases visuais legados em vez de `--ds-*`;
- dezenas de tamanhos de fonte entre ~0.50rem e 0.68rem;
- 303 `<button>` nativos contra 26 usos do primitive `<Button>`;
- 24 wrappers `request<T>()` independentes na camada `lib/*-api.ts`;
- componentes importam CSS de `app/`, invertendo a direção desejada de dependência;
- 29 de 72 arquivos de teste frontend leem código-fonte diretamente;
- centenas de assertions por regex/string sobre implementação.

### 2.3 Backend

Pontos positivos preservados:
- PostgreSQL + Flyway autoritativos;
- `open-in-view=false`;
- relações `@ManyToOne` explicitamente LAZY;
- transações declaradas;
- Integration Core já demonstra uso adequado de adapters;
- testes unitários e ITs reais com banco;
- segurança de sessão, CSRF, rate limiting de login e tokens hasheados.

Riscos estruturais:
- `SessionService` possui 13 dependências;
- `MechanicsService` possui 10;
- `QuizService` possui 9;
- existem dependências bidirecionais entre diversos packages;
- a análise de imports revelou um SCC transitivo envolvendo a maior parte dos módulos;
- `session ↔ realtime`, `session ↔ timer`, `journey ↔ study`, `content ↔ journey`, `activity ↔ scoring` e outros pares dependem diretamente entre si;
- 19 instâncias locais de `JsonMapper.builder().build()`;
- API antiga de integrações ainda convive com tipos marcados para remoção;
- regras de domínio usam `IllegalStateException` extensivamente, sem contrato HTTP uniforme fora da área de integrações;
- paginação é rara e deve ser revisada antes do crescimento do acervo.

### 2.4 Design e documentação

- existe `DESIGN_SYSTEM.md`, mas a adoção real é parcial;
- tipografia e densidade atuais violam parte das próprias metas de legibilidade;
- cores, radius, shadow, spacing e componentes continuam sendo definidos localmente em múltiplos lugares;
- a linguagem visual da Arena ainda mistura dashboard, neon/gaming e padrões genéricos de interfaces geradas por IA;
- README, STATUS_ATUAL e ROADMAP possuem divergências de estado e datas;
- documentação histórica deve continuar intacta; apenas fontes correntes devem ser reconciliadas.

## 3. Princípios do saneamento

1. **Sem rewrite.** Refatoração incremental e reversível.
2. **Comportamento antes de estética.** Nenhuma mudança visual ampla durante P0/P1.
3. **Uma fonte de verdade por responsabilidade.**
4. **Dependências apontam para contratos estáveis, não para implementações concretas.**
5. **SOLID é ferramenta, não meta numérica.** Aplicar onde reduz acoplamento e melhora testabilidade.
6. **CSS deve ter ownership explícito.** Evitar cascata histórica como mecanismo de arquitetura.
7. **Testes devem validar comportamento/contrato, não presença de strings no source, salvo testes deliberadamente estáticos.**
8. **Nenhum novo domínio funcional durante o gate, exceto correções necessárias para manter o comportamento existente.**
9. **Feature flags e compatibilidade só quando houver necessidade real.**
10. **Documentação corrente deve refletir o código corrente.**

---

# P0 — Segurança e baseline confiável

## P0.1 Atualizar Next.js vulnerável

Problema observado na auditoria inicial:
- Next.js 16.3.3;
- `npm audit --omit=dev` reportava vulnerabilidade crítica com correção disponível em 16.3.8.

**Status:** concluído. O frontend foi atualizado para Next.js 16.3.8 e o audit de produção passou com 0 vulnerabilidades.

Ações:
1. atualizar Next.js para versão corrigida compatível;
2. revisar release notes entre 16.3.3 e versão escolhida;
3. executar:
   - `npm test`;
   - `npm run typecheck`;
   - `npm run build`;
   - E2E crítico;
4. registrar a atualização no changelog técnico.

**Gate:** `npm audit --omit=dev --audit-level=high` sem vulnerabilidade crítica conhecida aplicável.

## P0.2 Resolver o teste frontend vermelho

Não atualizar o teste mecanicamente.

Fluxo:
1. identificar o requisito que o teste pretendia proteger;
2. decidir se `arena-nav-context` ainda faz parte do contrato;
3. se não fizer, substituir por assertion comportamental/semântica;
4. se fizer, corrigir a implementação;
5. deixar `npm test` 100% verde.

**Gate:** 273/273 ou novo total equivalente, sem teste alterado apenas para mascarar regressão.

**Status:** concluído em 273/273. As assertions da Arena foram atualizadas para verificar o contrato extraído em `ArenaLiveChrome.tsx`, em vez de exigir markup legado removido.

## P0.3 Congelar baseline

Criar checkpoint verificável:
- SHA;
- branch;
- schema V37;
- resultados dos gates;
- screenshots desktop principais da Arena;
- documentação corrente sincronizada.

Não criar tag/release pública sem gate formal.

**Checkpoint técnico P0:** `99d00a2` na branch `chore/v0.8-architecture-stabilization`, schema V37, frontend 273/273, typecheck/build verdes, audit 0 vulnerabilidades, backend `mvn verify` verde com 106 unitários + 86 ITs e E2E críticos/shell verdes.

---

# P1 — Arena Live Shell e fronteiras frontend

## P1.1 Estabilizar o shell

Contrato definitivo:

```text
ArenaLiveShell
├── ArenaSidebar
│   ├── Brand
│   ├── Navigation
│   └── TeacherProfile
└── ArenaWorkspace
    ├── ArenaSessionHeader
    └── ArenaCockpit
        ├── ArenaStage
        └── ArenaContextRail
```

Regras:
- sidebar não participa do grid interno do cockpit;
- header ocupa somente o workspace;
- context rail nunca recebe prioridade sobre o palco;
- apenas a região de navegação da sidebar rola;
- perfil do professor permanece acessível;
- sem `margin-left/calc()` para simular colunas estruturais.

**Status:** concluído para desktop. `ArenaLiveShell`, `ArenaSidebar` e `ArenaSessionHeader` estão extraídos; o header deixou de usar compensações negativas de largura/margem e o shell passou em E2E geométrico nos quatro viewports definidos pelo gate. O contrato vertical também foi estabilizado: Stage e Context Rail ficam contidos na viewport, a roleta adapta sua altura disponível, Ações rápidas e código/QR permanecem visíveis e apenas a lista de participantes rola. Há cobertura adicional com 22 participantes em 1821×831.

## P1.2 Extrair ArenaApp sem big bang

Objetivo: reduzir responsabilidades, não perseguir número arbitrário de linhas.

Extrações candidatas:
- `ArenaLiveShell.tsx`;
- `ArenaSidebar.tsx`;
- `ArenaSessionHeader.tsx`;
- `ArenaContextRail.tsx`;
- `useArenaRealtime.ts`;
- `useArenaSession.ts`;
- `useParticipantSelection.ts` somente quando o selector for implementado.

Não mover código apenas para gerar arquivos menores. Cada extração precisa ter responsabilidade e contrato próprios.

**Status:** em andamento. O chrome estrutural da Arena foi removido de `ArenaApp.tsx` e consolidado em `components/arena/live/ArenaLiveChrome.tsx`. `ArenaContextRail`, realtime e session orchestration permanecem no owner atual e só serão extraídos com contratos explícitos.

## P1.3 Normalizar acesso à API

Criar uma base comum para:
- base URL;
- CSRF;
- credentials;
- parsing de erro;
- 204;
- timeout/cancelamento quando necessário;
- erro tipado.

Os módulos de domínio continuam separados:
```text
http-client.ts
├── classroom-api.ts
├── journey-api.ts
├── mechanics-api.ts
├── study-api.ts
└── ...
```

Não criar um SDK genérico excessivamente abstrato.

## P1.4 Corrigir direção das dependências CSS

Regra:
- `app/` pode consumir componentes;
- componentes reutilizáveis não devem depender de CSS privado de páginas em `app/`.

Mover estilos compartilhados para:
- CSS Module do próprio componente; ou
- primitives/tokens compartilhados.

**Gate P1:**
- shell estável em 1366×768, 1440×900, 1536×864 e 1920×1080;
- zero sobreposição;
- nenhum overflow horizontal não intencional;
- `ArenaApp` deixa de ser owner do shell + realtime + todas as dinâmicas simultaneamente;
- API base centralizada;
- todos os gates P0 continuam verdes.

---

# P2 — Design System e CSS ownership

## P2.1 Definir camadas CSS

Ordem recomendada:

```text
tokens.css
theme.css
base.css
accessibility.css
ui primitives
feature/component modules
page-specific styles
```

`arena-polish.css` deixa de ser destino padrão de novas regras.

## P2.2 Consolidar tokens

Cobrir explicitamente:
- color roles;
- typography scale;
- spacing;
- radius;
- border;
- elevation;
- motion;
- focus;
- layout widths.

Eliminar gradualmente cores literais quando representam papéis semânticos repetidos.

Não tokenizar valores realmente únicos apenas por uniformidade artificial.

## P2.3 Tipografia e acessibilidade

Revisar todos os textos funcionais abaixo da escala mínima acordada.

Categorias:
- label;
- metadata;
- body;
- action;
- heading.

Meta:
- remover microtexto como solução de densidade;
- manter zoom global;
- contraste e foco consistentes;
- `prefers-reduced-motion`.

## P2.4 Primitives

Aumentar adoção real de:
- Button;
- IconButton;
- Field;
- Menu;
- Tabs;
- Badge;
- Card;
- EmptyState;
- LiveRegion.

Raw HTML continua permitido quando o primitive não agrega valor. O objetivo é consistência, não banimento.

## P2.5 Arena visual

Não fazer redesign completo nesta fase.

Apenas:
- remover inconsistências;
- reduzir glow/neon quando não comunica estado;
- garantir que gamificação seja evento/interação, não decoração permanente;
- preparar v0.9 para identidade visual própria.

**Gate P2:**
- novos componentes não adicionam regras globais sem justificativa;
- shell e novos componentes usam tokens/primitives por padrão;
- tipografia funcional atende a escala documentada;
- redução mensurável de `!important` e duplicidade de seletores;
- `DESIGN_SYSTEM.md` descreve o que o código realmente usa.

---

# P3 — Backend modularity e SOLID pragmático

## P3.1 Definir boundaries do monólito modular

Domínios centrais:
- classroom;
- session/live;
- activity/submission;
- scoring;
- journey/study/content;
- integration;
- identity.

Evitar package-level cycles como arquitetura normal.

## P3.2 Session/live orchestration

`SessionService` não deve conhecer diretamente todas as mecânicas.

Direção desejada:

```text
Session lifecycle
   ↓
ports/events
   ↓
Timer / Quiz / Poll / WordCloud / Buzzer / Realtime
```

Avaliar:
- application events pós-commit onde apropriado;
- interfaces estreitas para runtime cleanup;
- um `SessionLifecycleCoordinator` somente se reduzir dependências reais.

Não criar event bus genérico próprio.

## P3.3 MechanicsService

Separar responsabilidades concretas:
- participant draw;
- groups;
- boss runtime;
- runtime projection.

O sorteio deve evoluir para um domínio próprio antes do Spotlight:

```text
ParticipantSelectionService
├── eligibility
├── balancing policy
├── draw state
└── history
```

A view (Wheel/Spotlight) continua fora do backend.

## P3.4 Journey / Study / Content

Preservar:
- Journey = estrutura/progressão;
- Study = aplicação de acesso e consumo;
- Content = recurso/autoria/ingestão.

Remover dependências reversas onde um domínio de autoria passa a conhecer runtime de estudo sem necessidade.

## P3.5 Infra compartilhada

Centralizar via DI:
- `JsonMapper`;
- clock quando necessário para regras temporais testáveis;
- HTTP clients/providers externos;
- hashing/token helpers quando a duplicação representar a mesma política.

Não criar uma pasta `utils` genérica.

## P3.6 Exceções de domínio

Criar exceções com intenção:
- conflict/state transition;
- not found;
- invalid command;
- provider unavailable.

Mapear de forma uniforme no advice.

Não converter automaticamente todo `IllegalStateException`; migrar conforme boundaries forem tocados.

## P3.7 Deprecações de integração

Finalizar a transição da camada antiga de submission provider para o Integration Core.

Gate:
- nenhum tipo marcado `forRemoval` no código produtivo;
- adapters Microsoft/Google/Notion continuam passando seus contract tests.

**Gate P3:**
- reduzir dependências dos maiores serviços;
- eliminar ciclos diretos prioritários;
- não aumentar o SCC entre packages;
- testes unitários e ITs permanecem verdes;
- regras de domínio não migram para controllers/frontend.

---

# P4 — Estratégia de testes e quality gates

## P4.1 Classificar testes frontend

Separar:
1. unitários puros;
2. component/interaction;
3. contract/static;
4. E2E.

Testes que leem source code devem ser explicitamente `static-contract`, em número pequeno.

## P4.2 Substituir source-string tests frágeis

Priorizar os que protegem:
- Arena shell;
- Journey;
- Student Live;
- Library.

Migrar para:
- render + interação;
- assertions de acessibilidade;
- Playwright;
- contratos de API tipados.

## P4.3 Lint e formatação

Adicionar:
- ESLint compatível com Next/React;
- Prettier;
- EditorConfig.

Backend:
- começar com formatter/checkstyle leve;
- não introduzir PMD/SpotBugs em modo bloqueante até corrigir baseline.

Depois, habilitar análise incremental para novo código.

## P4.4 Testes visuais críticos

Playwright em:
- 1366×768;
- 1440×900;
- 1536×864;
- 1920×1080.

Cobrir:
- Arena shell;
- sidebar/profile;
- cockpit/rail;
- Student Shell;
- Journey Reader;
- Library.

Snapshots visuais complementam assertions geométricas; não substituem semântica.

## P4.5 CI

Pipeline mínimo:
1. frontend lint;
2. frontend test;
3. typecheck;
4. build;
5. backend verify;
6. audit/dependency check;
7. E2E crítico;
8. `git diff --check`.

**Gate P4:** CI reproduzível e verde antes de novo incremento funcional.

---

# P5 — Participant Selector / Grid + Spotlight transitório

**Status:** implementação candidata avançada e operacional. Grid + Spotlight permanece como padrão, enquanto a Roleta foi promovida de fallback técnico para apresentação alternativa selecionável e persistida por sessão. Isso não encerra P5 nem elimina os gates P2–P4: a decisão de manter ambas as apresentações no produto continua dependente de validação em aula.

## P5.1 Extrair seleção da representação

```text
ParticipantSelection
├── server-authoritative draw
├── eligibility
├── balancing
├── history
└── selected participant

Views
├── ParticipantGrid + TransientSpotlight
└── WheelParticipantSelector
```

## P5.2 Preservar roleta

A roleta atual está isolada em `WheelParticipantSelector` e pode ser selecionada pelo professor no drawer de configurações.

O critério continua `BALANCED`; a escolha `GRID_SPOTLIGHT` ou `WHEEL` altera somente a apresentação. A preferência é persistida no estado `QUICK_DRAW` da sessão e sobrevive à recarga sem nova migration.

Não há regra de sorteio duplicada no frontend: ambas as apresentações usam o mesmo comando server-authoritative.

## P5.3 Spotlight MVP

Implementado como Spotlight transitório, sem ocupar permanentemente o Stage.

Estados:
- READY;
- SELECTING;
- REVEALED.

O Grid permanece como contexto visual da turma; durante o reveal, o Spotlight assume o foco sem simular nomes passando ou slot machine. Motion curto e `prefers-reduced-motion` preservado.

## P5.4 Grid de participantes

Implementado em CSS Module com estados:
- disponível;
- ausente;
- já sorteado;
- selecionado agora.

O Grid é contexto da turma, não autoridade de seleção. O rail do Sorteio deixou de duplicar o roster e agora mostra resumo da sessão + histórico persistido de sorteios; QR/código permanece como contexto separado.

Em desktop, os cards usam largura limitada (máximo de 13.5rem) e alinhamento inicial, evitando que 1–8 participantes sejam esticados para ocupar todo o Stage.

## P5.5 Rollout

- `grid-spotlight` é o default de produto;
- `GRID_SPOTLIGHT` e `WHEEL` são persistidos por sessão no backend;
- o drawer usa radios nativos acessíveis para troca de apresentação;
- `NEXT_PUBLIC_ARENA_SELECTOR_MODE` fica restrito a fallback de compatibilidade;
- eventos `DRAW_COMPLETED` registram `method=BALANCED` e `drawCount`;
- `useParticipantSelection` concentra a orquestração frontend;
- E2E cobre Grid, Spotlight, retorno ao Grid, troca Grid ↔ Roleta, persistência, cards compactos, 22 participantes e os viewports do shell;
- validação em aula continua obrigatória para decidir se ambas as apresentações permanecem no produto.

**Validação técnica corrente:** frontend 274/274, typecheck/build verdes; Arena shell + selector 8/8 E2E; fluxos críticos 4/4; backend `mvn verify` verde com 106 testes unitários + 87 ITs.

---

# 4. Prioridade e bloqueios

| Prioridade | Item | Bloqueia novos recursos? |
| --- | --- | --- |
| P0 | Next.js crítico + teste vermelho + baseline | Sim |
| P1 | Arena shell + frontend boundaries | Sim para novo sorteio |
| P2 | CSS ownership + tokens/primitives mínimos | Sim para nova UI estrutural |
| P3 | backend boundaries prioritários | Sim para evolução do selector/domain |
| P4 | estratégia de testes + CI | Sim para merge do novo modelo |
| P5 | Spotlight + Grid | Novo recurso |
| Pós-gate | 16.5C e v0.9 visual | Não iniciar antes do gate |

## 5. O que não será feito neste gate

- rewrite em microserviços;
- Redux/Zustand apenas para reduzir `useState`;
- Tailwind ou troca de stack CSS sem necessidade;
- DDD completo;
- event sourcing;
- CQRS generalizado;
- Kubernetes/Kafka/Redis;
- redesign visual completo;
- troca do backend Spring/Next;
- remoção imediata da roleta;
- refatoração massiva de todos os packages de uma vez.

## 6. Estratégia de commits

Sugestão:

```text
chore(security): update next to patched release
test(arena): replace obsolete navigation source assertion
docs(architecture): establish v0.8 stabilization gate

refactor(arena): extract live shell
refactor(arena): isolate session header and context rail
refactor(arena): isolate realtime orchestration
refactor(api): centralize authenticated request transport

refactor(ui): establish css ownership for arena shell
refactor(ui): migrate arena shell to design tokens
a11y(ui): normalize functional typography

refactor(session): reduce live lifecycle coupling
refactor(draw): extract participant selection domain
refactor(infra): inject shared json mapper
refactor(integration): remove deprecated provider layer

test(frontend): reduce source-string contracts
chore(frontend): add lint and formatting gates
test(e2e): add arena shell viewport coverage

feat(draw): add spotlight selector
feat(draw): add participant grid
```

Cada commit deve ser funcional ou mecanicamente verificável. Não misturar refatoração estrutural e redesign.

## 7. Definition of Done do gate

O gate é encerrado somente quando:

- zero vulnerabilidade crítica conhecida aplicável em dependências de produção;
- frontend tests, typecheck e build verdes;
- backend verify verde;
- E2E crítico verde;
- Arena sem sobreposição em viewports alvo;
- shell possui ownership claro;
- `ArenaApp` não concentra mais shell + realtime + todas as dinâmicas;
- camada HTTP frontend possui transporte comum;
- nenhuma nova regra relevante entra em `arena-polish.css` sem ownership;
- Design System corrente corresponde à implementação;
- ciclos diretos prioritários do backend foram reduzidos;
- APIs marcadas para remoção foram eliminadas do código produtivo;
- documentação corrente está reconciliada;
- Spotlight só começa depois desse baseline.

## 8. Critério de sucesso

O sucesso não será medido por quantidade de arquivos, classes ou abstrações.

Será medido por:
- regressões mais fáceis de localizar;
- menor superfície de alteração por feature;
- layout previsível;
- testes que sobrevivem a refatorações semânticas;
- domínio independente de representação visual;
- redução de dependências circulares;
- consistência visual real;
- gates automatizados confiáveis.

