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

- eventos WebSocket de timer;
- sincronização professor/projetor;
- reconexão baseada no estado persistido;
- alertas intermediários sem criar escrita contínua no banco.

### 12.2 — Modo Projetor / Visão Pública

- rota dedicada para projeção;
- título e instrução da dinâmica atual;
- timer em destaque;
- controles de visibilidade.

### 12.3 — Nuvem de Palavras

- rodada vinculada à sessão;
- respostas via `/join`;
- armazenamento das submissões;
- normalização e frequência como projeção;
- modo ao vivo e modo coletar → revelar;
- projeção em tempo real.

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
