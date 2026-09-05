# Arena Dev v0.4.0 — Experiência de Aula ao Vivo

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
- manter o tooling de release `0.3.0` intacto até o próximo gate de versão.

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

### 12.4 — SessionEvent

Generalizar a linha do tempo da aula somente após Timer, Projetor e Nuvem
produzirem eventos concretos.

### 12.5 — Hardening

- testes backend/frontend;
- E2E;
- concorrência;
- segurança;
- observabilidade mínima;
- gate da release `v0.4.0`.

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
