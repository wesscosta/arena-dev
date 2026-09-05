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

#### 12.3C — Projeção visual

- renderização dedicada da nuvem no Modo Projetor;
- escala visual por frequência;
- transição entre coleta, revelação e encerramento;
- refinamento visual para projeção em sala.

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
