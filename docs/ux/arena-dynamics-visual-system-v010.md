# ArenaDev v0.10 — Plano técnico de convergência das dinâmicas

## Situação, restrições e decisão

**Problema central:** sete dinâmicas usam estruturas próprias para cabeçalho, composição, estados e ações, dificultando a transferência de aprendizagem do professor. O painel `Verificar aprendizagem` tem um bom cabeçalho, mas sua largura está limitada a 1180px, embora o palco disponha de mais espaço. Em `Nuvem de palavras`, a pergunta, os modos de exibição e a prévia competem por atenção em colunas separadas. A navegação mobile já foi alterada várias vezes; acrescentar menus não resolve a divergência entre as dinâmicas.

**Objetivo:** hierarquia visual, linguagem e semântica previsíveis sem apagar os modelos mentais distintos de Quiz, evidência pedagógica, votação, sorteio, nuvem, disputa por velocidade e batalha cooperativa.

**Não objetivos:** reescrever as APIs, alterar regras de XP, idempotência/sorteio, estados do servidor, acesso `/join`, estrutura do projetor ou mecânica das dinâmicas. Não padronizar pela força a geometria interna do Buzzer, Boss Battle ou grid de sorteio.

### Alternativas avaliadas

| Abordagem | Benefício | Custo / risco | Decisão |
| --- | --- | --- | --- |
| Ajustar CSS página a página | Entrega rápida | Divergência recorrente, overrides conflitantes | Rejeitada como solução definitiva |
| Um único componente gigante `DynamicScreen` | Uniformidade máxima | Acoplamento com regras de domínio, condicionais por dinâmica e regressões | Rejeitada |
| Contrato de layout, cabeçalho, campo de questão e ações reutilizáveis | Consistência sem acoplar domínio | Requer migração incremental e regressão por estado | **Adotada** |

## Contrato visual e pedagógico

1. **Contexto global:** sessão, turma, conexão e encerramento continuam no header da Arena. Não duplicar código/QR, timer ou CTA de encerramento no cabeçalho de cada dinâmica.
2. **Cabeçalho comum (`DynamicHeader`):** ocupa 100% da largura útil de `.arena-cockpit-main`; categoria (dinâmica ao vivo/evidência), título, descrição sucinta, status. Em telas de palco, o cabeçalho não deve incluir um segundo card de sessão.
3. **Composição:** `DynamicSection` separa etapas por finalidade: Preparação, Coleta/Interação, Resultado. Ordenação lógica: pergunta → ajustes → palco/resultado. Usar grid principal/lateral apenas quando o conteúdo justifica comparação simultânea; não criar lateral vazia.
4. **Perguntas:** `QuestionComposer` compacto, com altura inicial de 2–3 linhas, expansão conforme o conteúdo, limite de altura e contador opcional. Não restringir o comprimento armazenável no backend; preservar limites das APIs existentes.
5. **Controles:** `ToggleField` para condições binárias, rotulado com estado acessível. `select` para número de respostas. Não modelar dois modos mutuamente exclusivos como duas ações principais.
6. **Ações:** Preparar ≠ Abrir ≠ Revelar ≠ Encerrar. A ação destrutiva permanece secundária e requer confirmação quando há respostas pendentes. Controles operacionais não migram para CTA de aspecto destrutivo.
7. **Responsividade:** o conteúdo ocupa **100% da largura da coluna central disponível**, e não `100vw`; rail de participantes e sidebar permanecem independentes. No mobile, cards ficam em uma coluna, respeitando 320px, 375px, 390px e 430px sem overflow; modo desktop a 768–1920px. Conter widths com `minmax(0,1fr)` e `min-width:0`.
8. **Acessibilidade:** contraste e foco; regiões nomeadas; alvos de toque de pelo menos 44px; sem scroll vertical em menus horizontais; não depender de cor para sinalizar estado. `prefers-reduced-motion` preservado.

## Sequência de implementação (incremental e reversível)

| Fase | Arquivos e componentes | Mudanças concretas | Aceite |
| --- | --- | --- | --- |
| 0 — Auditoria e proteção | `ArenaApp.tsx`, sete dinâmicas, CSS Modules, `arena-shell.spec.ts` | Identificar status, CTAs, campos, painéis e transições; registrar decisão | Sem regras de domínio reimplementadas |
| 1 — Design contracts | `frontend/components/arena/dynamics/DynamicHeader.tsx`, `QuestionComposer.tsx`, `ToggleField.tsx`, CSS Modules | Primitivas com props explícitas e sem chamadas de API | Compilam isoladas, estado e semântica acessíveis |
| 2 — Evidência | `LearningCheckPanel.tsx/.module.css` | Cabeçalho comum full-width, textarea autoajustável, formulário e lateral sem altura artificial, densidade de alternativas | Objetivo/questão/correta/preparo e retomada intactos |
| 3 — Nuvem | `WordCloudPanel.tsx/.module.css` | Pergunta compacta; quantidade ao lado de alternância binária; preview **abaixo** da configuração, com CTA visível; leitura de resultados preservada | Configuração/abrir/revelar/encerrar, eventos e estados sem alteração |
| 4 — Quiz e votação | `QuizPanel.tsx/.module.css`, `PollPanel.tsx/.module.css` | Cabeçalho comum, painéis do mesmo sistema e perguntas compactas, estado legível | Quiz: preparar/abrir/revelar/encerrar; votação: ocultar/mostrar conforme estado |
| 5 — Dinâmicas de palco | `ParticipantSelectionExperience.tsx`, `ArenaApp.tsx` (Buzzer, Boss, Roleta) | Mesmo cabeçalho; preserva palco do grid/sorteio, orb/placar e resultado | Sorteio e XP idempotentes; competição e feedback não alterados |
| 6 — Verificação | E2E + revisão Safari manual | Screenshots, regressão fluxo/API, teclado e layout nos breakpoints, temas | CI/build/tsc e suíte E2E verdes; Safari manual ainda requerido |

### Estados que precisam de proteção nos testes

- `PREPARAR`: formulário vazio e preenchido; validação e CTA desabilitado; criação de objetivo e alternativas.
- `AO VIVO`: recebimento de participantes/respostas, reconexão, participação parcial.
- `RESULTADO`: distribuição visível ao professor, revelação pública somente no momento permitido.
- `ENCERRADO`: voltar, nova rodada e resultados persistidos.
- Sorteio pendente de confirmação/reconciliação nunca pode emitir novamente XP.

## Critérios de GO técnico

1. `npm run typecheck` ou `npx tsc --noEmit`, `npm run build`, `npm run lint` sem novos erros.
2. Testes E2E autenticados em ambiente isolado sem tocar as turmas reais; preservar testes anteriores de sorteio, PWA, conexão e sessão.
3. Verificação geométrica de header/inputs/controles em 320, 390, 430, 768 e desktop; tema claro e escuro, zoom e estado de foco.
4. Documentação revisada e CSS sem novos `!important` globais.
5. Nenhum commit, tag ou release sem autorização/decisão GO/NO-GO explícita. A homologação em Safari iOS real é externa aos E2E Chromium.

## Registro da execução local — 09/10/2026

**Aplicado no código (sem commit/push):**

- `DynamicHeader`, `QuestionComposer`, `ToggleField`, `DynamicSection` e CSS Modules locais (sem lógica de negócios ou dependências externas).
- `LearningCheckPanel`: novo cabeçalho e enunciado com autoajuste, removido `max-width:1180px`, mantendo layout principal/lateral responsivo e fluxo de evidências sem XP.
- `WordCloudPanel`: composição sequencial e compacta; limite por aluno associado à label; alternância acessível de exibição; palco sob o formulário; estado ao vivo preservado.
- `QuizPanel` e `PollPanel`: cabeçalhos comuns e seções; Votação usa `QuestionComposer` e `ToggleField` binário (mantido o booleano `liveResults`).
- `ParticipantSelectionExperience`: cabeçalho comum, barra de sorteio independente e viewport de participantes dependente do conteúdo; resultado/reconciliação preservados.
- `ArenaApp`: cabeçalhos comuns para Roleta, Buzzer e Boss Battle, estes dois fora das colunas internas para ocupar toda a largura da área central.
- `arena-navigation-mobile.css`: menu de ferramentas ancorado à viewport (inclusive 320px), e abas ocupando a largura da segunda linha.

**Evidência automatizada:** `npx tsc --noEmit` e compilação do frontend Docker aprovados; `npm run lint` sem erros (92 avisos preexistentes). Testes Playwright autenticados em stack isolada: **59/59 aprovados**, incluindo testes novos de sete cabeçalhos nos breakpoints 320, 390, 430, 768 e 1440 px, ausência de overflow, modo de exibição, textarea autoexpansível, ordenação da prévia, foco/menu e sorteio.

**Limites:** esses testes usam Chromium e uma instância E2E isolada; ainda não são evidência de homologação no Safari iOS real, nem de resultado de piloto pedagógico. Não alteram a decisão oficial GO/NO-GO da v0.10.

## Correção transversal posterior — unificação de ações e projeção

- `DynamicHeader` permanece o **único cabeçalho de identidade** por dinâmica. Não usar alturas mínimas de preenchimento em formulários de Votação, Quiz e Nuvem.
- O Sorteio incorpora progresso curto, ajustes e CTA dentro de `DynamicHeader`; o painel de participantes fica imediatamente abaixo. O painel lateral de sessão pode continuar detalhando histórico, sem nova toolbar de sorteio.
- O modo roleta preserva sua própria ação de sorteio no palco; nova rodada e ajustes ficam no header.
- O projetor é uma **ação da sessão, não da dinâmica**: manter um único `aria-pressed` em `ArenaSessionHeader` e eliminar botões isolados em Boss Battle, Votação e Nuvem. A janela aberta é real (em nova aba), não uma flag visual.
- Estado `Projetando` exige heartbeat emitido pela janela de projeção. A desativação usa um comando `localStorage` de mesma origem para solicitar `window.close()`; a interface só informa desativação após expiração/remoção da presença efetiva. Se o navegador bloquear `window.close()`, solicitar fechamento manual e não fingir sucesso.
- A sincronização é **local a uma mesma origem/perfil de navegador**; não é controle de projetores em dispositivos remotos nem estado armazenado no servidor. O uso de `noopener,noreferrer` é preservado por segurança.
- Verificação E2E: cabeçalho do Sorteio sem subcard extra, cabeçalho da Votação compacto nos breakpoints, único toggle global, abertura e fechamento efetivos da aba de projeção, manutenção de estado entre dinâmicas.

### Refinamento do contrato — 09/10 (header e projeção)

- `DynamicHeader` agora separa explicitamente `status`, `summary`, `secondaryActions`, `primaryAction`; mantém `actions` legado para fluxos em que não há ação principal direta. Altura determinada pelo conteúdo em todas as resoluções.
- `Sorteio`: progresso, Ajustes e Sortear/Iniciar próxima rodada pertencem **ao mesmo cabeçalho**; removida a necessidade de toolbar/subcard operacional independente. A grade abaixo não replica esses controles. Eventos de XP e estado de confirmação do Spotlight permanecem inalterados.
- `Votação`: cabeçalho preparado com altura intrínseca. O CTA **Abrir votação** continua próximo do formulário até a pergunta e as opções estarem preenchidas; não é duplicado no cabeçalho.
- `Projetar`: **controle de sessão global** e não de cada dinâmica. A Arena já implementa troca de estado vinculada à presença real da janela (`useProjectorControl` / `ProjectorView`); mantém um único toggle visível e seu `aria-pressed` em todas as dinâmicas, inclusive Boss Battle. A versão marcada como projetando só aparece após confirmação da janela; o desligamento solicita fechamento e espera o desaparecimento da presença. A garantia se limita a abas do mesmo navegador/origem, sem pretender controlar projeção em outro dispositivo.
- Regressão: header compacto em cinco breakpoints, estrutura consolidada, ausência de controles duplicados e teste real de abrir/fechar janela de projeção (Chromium, stack isolada).

### Refinamento de identidade visual — 09/10/2026

- `DynamicHeader` exige a prop `dynamic` tipada (as sete dinâmicas da Arena, exceto `runbook`) e resolve o ícone por `ArenaGlyph` internamente. **Não existem mais ícones opcionais definidos por tela**, evitando ausências ou divergências em relação à navegação.
- Todos os cabeçalhos usam composição e alinhamento vertical centralizados (`identity`, ícone e metadados), ícone circular ligeiramente ampliado (2,75 rem desktop; 2,4 rem mobile) e tipografia hierarquizada (título 1,5–2 rem desktop; 1,48 rem mobile).
- A altura permanece determinada pelo conteúdo e os espaçamentos no mobile até 560 px foram calibrados para preservar o contrato compacto de 320 px na Votação e no Sorteio.
- A regressão visual E2E compara o SVG de cada header com o mesmo ícone no menu, verifica alinhamento vertical da área de identidade e testa ausência de overflow em 320, 390, 430, 768 e 1440 px.
- Nenhuma mecânica, API, pontuação, comportamento do projetor ou estado de sessão foi alterado.

### Correção do modal de Sorteio — decisão pedagógica e segurança

O Spotlight deixa de apresentar duas confirmações que competiam como ações principais. A confirmação é única, sem XP por padrão e com concessão opcional explicitamente ativada. `PASSED` e `VOIDED` continuam como desfechos separados porque alteram de maneira diferente a elegibilidade do estudante na rodada. O modal é portaled à viewport e restringe o foco para não ficar atrás do header no iOS. Contrato detalhado: `docs/ux/arena-draw-outcome-contract-v010.md`.
