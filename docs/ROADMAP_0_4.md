# Arena Dev v0.4.0 — Experiência de Aula ao Vivo

> **Fechamento 10/09/2026:** `v0.4.0` foi publicada e está congelada.
> PR #9 foi integrado em `main` no commit `ccfb7f9`; o CI final
> `34428450704` concluiu com backend, frontend e Compose/E2E verdes.
> Este roadmap passa a ser **histórico**. Checkboxes antigos preservam
> snapshots de planejamento e não devem ser interpretados como blockers
> atuais. O trabalho corrente está em [`ROADMAP_0_5.md`](ROADMAP_0_5.md).

> **Checkpoint 08/09/2026:** `v0.3.0` está publicada. Na v0.4 estão
> consolidados Timer, Projector, Word Cloud, ActivityStep/editor/runtime,
> navegação contextual e 12.3D.7A–D. **12.4D.0A — Live Stage / Presentation
> State está implementado localmente** e Sorteio, Nuvem e Buzzer já usam o
> palco compartilhado. **12.4D, 12.4E, 12.4F, 12.5 e 12.6 estão implementados localmente. A linha está em release candidate `0.4.0`; faltam apenas as evidências externas do gate final antes da tag.**

A `v0.4.0` evolui o Arena Dev Community a partir da baseline estável `v0.3.0`,
mantendo a sessão de aula como contexto central e evitando ampliar o produto
para um LMS.

## Objetivo

Melhorar a condução da aula ao vivo com ferramentas sincronizadas e de baixa
fricção para o professor.

## Incrementos

### 12.0 — Bootstrap documental

- congelar `v0.3.0` como baseline;
- registrar o escopo da `v0.4.0`;
- manter o tooling de release `0.3.0` intacto até o gate de versão do 12.6; depois alinhar tudo em `0.4.0`.

### 12.1 — Controle de tempo da aula

#### 12.1A — Fundação persistente

- migration `V7__session_timers.sql`;
- `SessionTimer` persistente no PostgreSQL;
- estados `READY`, `RUNNING`, `PAUSED`, `FINISHED` e `CANCELLED`;
- timer livre vinculado à `ClassSession`;
- um único timer aberto por sessão;
- comandos REST para criar, iniciar, pausar, retomar, estender, finalizar e cancelar;
- `endsAt` como referência autoritativa durante a execução, sem gravação por segundo;
- encerramento da aula cancela timer ainda aberto;
- testes de integração e atualização do gate de migrations.

#### 12.1B — Realtime

- `TIMER_STATE` como evento único de projeção do estado autoritativo;
- broadcast somente após commit das mutações do timer;
- snapshot inicial enviado ao professor e ao participante após autenticação;
- reconexão baseada no último estado persistido no PostgreSQL;
- `occurredAt` do envelope realtime e `endsAt` do timer como âncoras de tempo;
- countdown e alertas intermediários derivados no cliente, sem evento por segundo;
- o Modo Projetor reutilizará o mesmo contrato no Incremento 12.2;
- eventos semânticos (`TIMER_STARTED`, `TIMER_PAUSED` etc.) ficam reservados
  para a futura linha do tempo `SessionEvent`, evitando duplicar contratos.

#### 12.1C — Interface do professor

- aba `Tempo` integrada à Arena;
- presets de 30 s, 1, 2, 5, 10, 15, 20 e 30 minutos;
- duração personalizada;
- iniciar, pausar, retomar, estender, finalizar e cancelar;
- extensões rápidas de +30 s, +1 min e +5 min;
- countdown derivado de `endsAt`, sem persistência por segundo;
- compensação de diferença de relógio usando `occurredAt` do WebSocket;
- alertas locais de 5 min, 1 min e encerramento;
- snapshot REST como fallback e `TIMER_STATE` como sincronização entre telas;
- estado terminal calculado visualmente quando `endsAt` é alcançado;
- editor compacto de duração em horas, minutos e segundos, com presets rápidos;
- ação `Iniciar agora` para criar e iniciar em um único fluxo;
- modo foco em tela cheia para projeção durante a condução, minimizável sem pausar;
- ação explícita para reabrir o Timer em tela cheia durante a sessão.

### 12.2 — Modo Projetor / Visão Pública

- rota pública `/projector?code=...`, separada do painel administrativo;
- acesso validado pelo mesmo código temporário da sessão;
- endpoint público somente leitura sem dados de alunos ou controles do professor;
- audiência WebSocket própria dentro do mesmo `SessionRealtimeGateway`;
- projetor recebe apenas eventos explicitamente públicos;
- snapshot inicial com turma, sessão, horário do servidor e estado do Timer;
- `TIMER_STATE` reutilizado como contrato autoritativo em tempo real;
- countdown local derivado de `endsAt` com compensação por horário do servidor;
- título e instruções do Timer em destaque;
- estado de espera quando nenhuma dinâmica está projetável;
- código da sessão disponível para entrada dos alunos via `/join`;
- botão `Modo Projetor` no painel do professor;
- suporte a fullscreen do navegador;
- encerramento da sessão propagado para a tela pública;
- arquitetura preparada para Buzzer, Nuvem de Palavras e outras projeções seguras.

### 12.3 — Nuvem de Palavras

#### 12.3A — Fundação persistente e realtime

- rodada vinculada à sessão;
- migrations `V8` e correção de tipo em `V9`;
- armazenamento das submissões;
- normalização e frequência no backend;
- limite de 1 a 5 respostas por participante;
- `WORD_CLOUD_STATE` como projeção pública segura;
- `WORD_CLOUD_PARTICIPANT_STATE` como estado privado do aluno;
- submissão autenticada por `WORD_CLOUD_SUBMIT`;
- modo ao vivo e modo coletar → revelar.

#### 12.3B — Professor e participação via `/join`

- aba `Nuvem` dentro da Arena com sessão ativa;
- criação da pergunta, limite por participante e modo de revelação;
- acompanhamento de participantes e respostas em tempo real;
- revelar e encerrar a rodada pelo painel do professor;
- nova rodada após encerramento;
- formulário de participação integrado ao `/join`;
- restauração do estado privado do participante pelo backend;
- respostas enviadas pelo WebSocket já autenticado da sessão.

#### 12.3B.1 — Acesso reutilizável da sessão

- extrair `SessionAccessCard` como componente compartilhado;
- exibir URL pública completa, código temporário e QR Code;
- ações `Copiar link` e `Abrir como aluno`;
- aviso explícito quando a URL usa `localhost`/loopback;
- reutilizar em `Arena → Ao vivo` e `Arena → Nuvem`;
- manter rotação de código apenas no contexto administrativo `Ao vivo`;
- nenhuma nova migration ou contrato de backend.

#### 12.3B.2 — Refinamento de participação

- ocultar o Buzzer no `/join` quando estiver `IDLE`;
- exibir estado neutro `Aguardando próxima dinâmica` quando nada estiver liberado;
- distinguir `presentes`, `responderam`, `pendentes` e `respostas` no painel da Nuvem;
- usar `participantCount` como quantidade de participantes únicos que responderam, não como total da sessão;
- derivar pendentes a partir dos participantes marcados como presentes;
- confirmar encerramento da rodada quando ainda houver alunos pendentes;
- manter o fechamento permitido após confirmação explícita do professor;
- nenhuma migration ou alteração de contrato do backend.

#### 12.3C — Projeção visual

- [ ] consumir `WORD_CLOUD_STATE` no Modo Projetor;
- [ ] Nuvem `COLLECTING` ou `REVEALED` assume o palco principal;
- [ ] manter Timer ativo como informação secundária compacta quando coexistir;
- [ ] pergunta em destaque para leitura à distância;
- [ ] coleta oculta não revela termos antes do comando do professor;
- [ ] modo ao vivo mostra termos conforme chegam;
- [ ] escala tipográfica calculada pela frequência, evitando depender de `×N`;
- [ ] manter contadores públicos anônimos de `responderam` e `respostas`;
- [ ] preservar o resultado da rodada encerrada até outra dinâmica assumir o foco;
- [ ] CTA `Projetar Nuvem` no painel do professor;
- [ ] fullscreen continua sendo controlado pelo navegador no Modo Projetor.

### 12.3D — Refatoração da navegação e dashboard do professor

#### 12.3D.1 — Visão geral como hub de turmas

- [ ] busca instantânea por nome ou código da turma;
- [ ] ordenação `Recentes`, `Nome A–Z/Z–A` e `Código A–Z/Z–A`;
- [ ] modo `Recentes` prioriza turma selecionada com sessão ativa, demais sessões ativas e histórico de acesso;
- [ ] persistir sequência de acesso como preferência local de interface, sem virar fonte de verdade de domínio;
- [ ] cards continuam sendo a entrada principal para o workspace da turma;
- [ ] preservar filtros `Todas`, `Ativas` e `Inativas`;
- [ ] manter `Turma` e `Arena` na sidebar até concluir 12.3D.2/12.3D.3.

#### 12.3D.2 — Home da turma e CTA da Arena

- [ ] separar visualmente `Gerenciar turma` da principal ação pedagógica;
- [ ] transformar `Iniciar Arena` em CTA dominante da Home da turma;
- [ ] quando existir sessão ativa, trocar para `Continuar Arena`;
- [ ] destacar visualmente estado de sessão em andamento;
- [ ] manter CTA desabilitado em turma inativa, com mensagem explicativa;
- [ ] preparar remoção futura do item global `Arena` da sidebar;
- [ ] preservar `Arena` na sidebar até validar o fluxo contextual pela Home da turma.

#### 12.3D.2B — Home enxuta e navegação por abas

- [ ] remover o card interno do CTA da Arena;
- [ ] manter apenas `Iniciar Arena` / `Continuar Arena` centralizado e com maior destaque;
- [ ] remover `Top da turma` da Home, pois Ranking já possui aba própria;
- [ ] remover `Ações da turma`, pois Alunos, Atividades, Ranking e Histórico já são acessados pelas abas;
- [ ] aumentar fonte, ícone e área clicável das abas da turma;
- [ ] tratar as abas superiores como navegação principal do workspace pedagógico;
- [ ] preservar métricas-resumo da Home sem duplicar conteúdo detalhado.

#### 12.3D.3 — Sidebar enxuta, Perfil e Configurações

- [ ] manter apenas `Visão geral` como entrada operacional global na sidebar;
- [ ] remover `Turma` da sidebar: acesso passa pelos cards da Visão geral;
- [ ] remover `Arena` da sidebar: acesso passa pelo CTA contextual da Home da turma;
- [ ] preservar `classroom` e `arena` como views internas, sem atalhos globais redundantes;
- [ ] ocultar seletor global de turma na Visão geral e em Configurações;
- [ ] criar Perfil do professor no rodapé da sidebar;
- [ ] menu toggle do perfil com `Configurações` e `Sair`;
- [ ] criar view `Configurações`;
- [ ] mover `Backup e restauração` para Configurações;
- [ ] mover estado técnico de persistência/backend para Configurações;
- [ ] manter fluxo principal `Visão geral → Turma → Arena`.

#### 12.3D.4 — Shell sem sidebar

- [ ] remover definitivamente a sidebar do shell;
- [ ] transformar a marca `ARENA DEV` no retorno global para `Visão geral`;
- [ ] mover perfil/configurações para o canto superior direito;
- [ ] mostrar contexto por breadcrumb no cabeçalho;
- [ ] manter seletor de turma apenas em `Turma` e `Arena`;
- [ ] permitir retorno rápido à sessão ativa pelo cabeçalho;
- [ ] ampliar a largura útil das páginas e da Arena.

#### 12.3D.5 — Consolidação das Dinâmicas *(historicamente “Interações”)*

- [x] remover as abas independentes `Nuvem` e `Ao vivo`;
- [x] consolidar a área visual como `Dinâmicas` (ID interno `interactions` preservado por compatibilidade);
- [x] disponibilizar `Sorteio`, `Nuvem de Palavras` e `Buzzer` como modos da mesma área;
- [x] não exibir opções ainda não implementadas como controles desabilitados;
- [x] mover URL, código e QR para `Acesso dos alunos`, ação global da sessão;
- [x] retirar o acesso duplicado de dentro da Nuvem;
- [x] preservar o mesmo join code para todas as dinâmicas;
- [x] manter `Condução` como fluxo planejado e `Dinâmicas` como ações ad hoc;
- [x] preparar inclusão futura de Votação sem criar nova aba principal.

#### 12.3D.6 — Navegação contextual e cards de turma

- [x] consolidar `Visão geral › Turma › Arena`;
- [x] transformar o nome da turma em seletor com busca por nome/código;
- [x] remover select isolado e selo global `Sessão ativa`;
- [x] remover badges redundantes `Ativa` e `Selecionada`;
- [x] mostrar apenas `INATIVA` ou `AO VIVO` quando aplicável;
- [x] consolidar ações do card em `⋯`;
- [x] permitir Editar, Desativar/Reativar e Excluir;
- [x] impedir desativação de turma com sessão ativa.

#### 12.3D.7 — Design System & Accessibility

##### 12.3D.7A — Foundation

- [x] criar tokens globais;
- [x] criar base tipográfica semântica;
- [x] criar foundation de acessibilidade;
- [x] remover microtipografia funcional do header;
- [x] padronizar alvos interativos;
- [x] aplicar tokens em Header, seletor de turma, Arena tabs e Roteiro;
- [x] documentar Design System e Definition of Done.

##### 12.3D.7B — Core UI Primitives

- [x] Button / IconButton / Badge;
- [x] Tabs / Menu / Breadcrumb;
- [x] Field / Card / EmptyState.

##### 12.3D.7C — Accessibility Pass

- [x] skip link funcional e landmarks;
- [x] teclado completo para menus/tabs;
- [x] aria-live controlado para realtime;
- [x] contraste;
- [x] zoom/reflow 200% e 400%.

##### 12.3D.7D — Arena Responsive & Visual Polish

- [x] reduzir card soup;
- [x] transformar Fonte da Arena em toolbar;
- [x] refinar Sorteio e Pontuação;
- [x] revisar responsividade, Projetor e /join.

### 12.4 — Roteiro ao Vivo

A abstração de sequência passa a ser justificada por quatro blocos concretos:
`SLIDE`, `QUESTION`, `WORD_CLOUD` e `POLL`.

#### 12.4A — Fundação persistente

- [x] `ActivityStep` como template ordenado vinculado à `Activity`;
- [x] tipos `SLIDE`, `QUESTION`, `WORD_CLOUD` e `POLL`;
- [x] migration `V10__activity_steps.sql`;
- [x] API administrativa `GET/PUT /api/activities/{id}/steps`;
- [x] cópia de atividade preservando roteiro e remapeando questões;
- [x] nenhum estado de sessão/runtime dentro de `activity_steps`.

#### 12.4B — Editor de autoria

- [x] terceira aba `Roteiro` dentro do editor de Atividades;
- [x] adicionar, remover e reordenar blocos;
- [x] editar configuração de Slide, Questão, Nuvem e Votação;
- [x] salvar roteiro somente no backend;
- [x] persistir atividade/questões antes de referências `QUESTION`;
- [x] restaurar roteiro ao reabrir a atividade.

#### 12.4C — Runtime do step atual

- [x] evoluir `SessionDynamic.ARENA` como fonte autoritativa do step atual;
- [x] persistir `currentStepId` e `currentStepPosition` sem nova tabela;
- [x] ativar uma Activity como roteiro da sessão;
- [x] `Anterior` / `Próximo` controlados exclusivamente pelo professor;
- [x] sincronizar step `QUESTION` com `currentQuestionId` existente;
- [x] preservar o fluxo legado para atividades sem `ActivityStep`;
- [x] restaurar o step após reload;
- [x] não avançar automaticamente por Timer, resposta ou outra dinâmica;
- [x] manter WebSocket `LIVE_STEP_STATE` fora deste incremento.

#### 12.4D.0 — Fundação de Live Stage, Dinâmicas e identidade

##### 12.4D.0A — Live Stage / Presentation State

- [x] `LiveStageState` autoritativo por sessão;
- [x] um único `primary`, sem flags concorrentes por feature;
- [x] audiências `PROJECTOR`, `PARTICIPANTS` e `BOTH`;
- [x] Timer como overlay transversal e tipo de palco opcional;
- [x] persistência via `SessionDynamic.LIVE_STAGE`, sem migration nova;
- [x] evento `LIVE_STAGE_STATE`;
- [x] projeções diferentes para professor, Projetor e `/join`.

##### 12.4D.0B — Dinâmicas e adapters de palco

- [x] nomenclatura visual `Interações` → `Dinâmicas`;
- [x] Sorteio dentro de Dinâmicas;
- [x] `DRAW` projetável com `displayName` resolvido no backend;
- [x] `WORD_CLOUD` assume o palco ao abrir rodada;
- [x] `BUZZER` assume o palco ao abrir rodada;
- [x] payload público do Buzzer evita IDs administrativos;
- [ ] adapters completos para `SLIDE`, `QUESTION` e `BOSS_BATTLE`;
- [ ] `QUIZ` somente quando existir runtime próprio;
- [x] `POLL` integrado pelo 12.4D.1.

##### 12.4D.0C — Identidade de exibição

- [x] mover `preferredName` para `Enrollment`;
- [x] definir política de `displayName` resolvida no backend;
- [x] não enviar nome completo + apelido para clientes públicos decidirem localmente;
- [x] `Student.nickname` deixa de ser autoridade contextual e permanece apenas como fallback legado.

##### 12.4D.0D — Reconhecimento opaco do dispositivo

- [x] device claim opaco e relativamente persistente;
- [x] separar device claim do participant token temporário;
- [x] reentrada com baixa fricção sem cookie/localStorage como fonte de domínio;
- [x] prever revogação e dispositivo compartilhado.

#### 12.4D.1 — Votação em runtime

- [x] `PollRound`, `PollOption` e `PollVote`;
- [x] voto autenticado pelo participant token da sessão;
- [x] single-choice no MVP;
- [x] resultado oculto ou ao vivo;
- [x] projeção agregada/anônima;
- [x] `/join` e Projetor derivados do mesmo Live Stage.

#### 12.4E — Orquestração Live Flow ↔ Live Stage

- [x] `WORD_CLOUD` preparado no roteiro pode abrir/reativar rodada sem duplicar domínio;
- [x] `POLL` preparado no roteiro reutiliza/reativa a mesma rodada vinculada ao step;
- [x] `QUESTION` reutiliza o domínio existente e assume o palco quando comandado;
- [x] `SLIDE` ganha projeção própria;
- [x] Boss Battle recebe adapter de palco;
- [x] Timer continua transversal;
- [x] não avançar automaticamente o roteiro por evento de dinâmica.

#### 12.4F — Consolidação pública `/join` + Projetor

- [x] contrato `LIVE_STAGE_STATE` e snapshot inicial;
- [x] `/join` já seleciona Sorteio/Nuvem/Buzzer/Poll/Question/Boss pelo palco;
- [x] Projetor já seleciona Sorteio/Nuvem/Buzzer/Poll/Slide/Question/Boss pelo palco;
- [x] aplicar `displayName`/device claim finais;
- [ ] concluir `QUIZ` somente quando existir runtime próprio;
- [x] reconexão restaurar integralmente palco + estado especializado por `RUNTIME_SNAPSHOT`;
- [x] Buzzer público separado da identidade administrativa e posição própria enviada em estado privado;
- [x] `AUTH_FAILED` encerra credencial inválida sem loop de reconnect;
- [x] `/join` pode recuperar novo participant token usando device claim válido;
- [x] Projetor REST recebe snapshot público completo antes do WebSocket;
- [x] Boss sincroniza nome/HP no Projetor e `/join`;
- [x] revisar acabamento visual público e estados de fallback/reentrada.

### 12.5 — SessionEvent

- [x] migration `V14__session_events.sql`;
- [x] `SessionEvent` separado de `ScoreEvent` e dos runtimes especializados;
- [x] sequência monotônica para ordenação estável;
- [x] tipos semânticos e ator `TEACHER`/`SYSTEM`;
- [x] instrumentar sessão, Live Flow/Arena, Sorteio, grupos, Buzzer, Timer, Nuvem, Poll e Boss;
- [x] não registrar heartbeat/reconnect/tick nem cada voto, palavra, press ou dano intermediário;
- [x] expiração natural do Timer gera `TIMER_FINISHED` de sistema uma única vez;
- [x] API por turma (recente/limitada) e por sessão (cronológica);
- [x] separar `Linha do tempo` e `Histórico de XP` na UI;
- [x] manter Timeline somente leitura e reversão exclusiva em `ScoreEvent`;
- [x] testes de integração e contratos frontend adicionados.

### 12.6 — Hardening

- [x] testes backend/frontend preservados e ampliados;
- [x] E2E Chromium com três fluxos críticos da v0.4;
- [x] concorrência permanece coberta pelos ITs autoritativos do backend;
- [x] rate limit de login e headers de segurança explícitos;
- [x] `X-Request-Id` + MDC e health separado em liveness/readiness;
- [x] manifests e tooling alinhados em `0.4.0`;
- [x] restore-check atualizado para Flyway V1–V14;
- [x] release gate local passa a validar readiness/liveness;
- [ ] `mvn verify` verde no estado final no ambiente normal/CI;
- [ ] Compose + três E2E verdes no estado final;
- [ ] CI remoto verde no mesmo SHA;
- [ ] backup real + restore-check + rollback ensaiado;
- [ ] `release-gate.sh final` verde;
- [ ] merge em `main`, tag `v0.4.0` e GitHub Release.

## Limites de escopo

Não pertencem a esta versão:

- LMS completo;
- calendário/Pomodoro pessoal;
- microserviços;
- Redis/Kafka;
- IA ampla;
- contas institucionais completas;
- multi-tenancy;
- marketplace;
- execução de código.
