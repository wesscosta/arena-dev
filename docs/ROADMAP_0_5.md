# Arena Dev v0.5.0 — Live Quiz & Structured Responses

> **v0.5 bootstrap — Live Quiz & Structured Responses**
>
> Baseline: `v0.4.0` publicada e congelada.  
> Branch: `feat/v0.5-live-quiz`.  
> Schema inicial: Flyway `V1–V14`.  
> Próximo incremento: **13.1 — Quiz Runtime**.

## Objetivo

Permitir que uma questão autorada seja executada como rodada ao vivo, respondida pelo `/join`, acompanhada pelo professor e projetada de forma segura, sem duplicar o domínio de atividades nem criar uma segunda fonte de pontuação.

## Modelo conceitual

```text
ActivityQuestion
      │
      └── executada como
            ↓
        QuizRound
            │
            └── ParticipantAnswer
                     ↓
                 avaliação
                     ↓
                 ScoreEvent
```

## Princípios obrigatórios

- `ActivityQuestion` continua sendo a fonte autoral;
- `QuizRound` representa execução ao vivo;
- `ParticipantAnswer` representa a resposta enviada;
- `ScoreEvent` continua sendo a única fonte de verdade para XP;
- Live Flow pode iniciar/revisitar Quiz sem duplicar runtime;
- reconnect restaura snapshot, não reexecuta comandos;
- nenhuma dinâmica avança o Live Flow automaticamente;
- Projetor e `/join` recebem projeções próprias por audiência.

## Incrementos

### 13.0 — Bootstrap documental

- [x] congelar `v0.4.0` como baseline;
- [x] registrar a publicação real da v0.4;
- [x] abrir a linha `v0.5 — Live Quiz & Structured Responses`;
- [x] definir fronteiras de autoria, runtime, resposta e XP;
- [x] manter manifests em `0.4.0`;
- [x] manter Flyway em V14 até existir domínio persistente novo.

### 13.1 — Quiz Runtime

- [x] definir `QuizRound`;
- [x] definir `ParticipantAnswer`;
- [x] vincular rodada a `ClassSession` e `ActivityQuestion`;
- [x] estados `READY`, `OPEN`, `LOCKED`, `REVEALED`, `CLOSED`;
- [x] uma resposta efetiva por participante/rodada no MVP;
- [x] permitir alteração da mesma resposta enquanto `OPEN`;
- [x] comandos preparar, abrir, bloquear, revelar e encerrar;
- [x] estado privado do participante;
- [x] projeção pública agregada e protegida antes do reveal;
- [x] migration `V15__quiz_runtime.sql`;
- [x] `QuizIT` adicionado com PostgreSQL/Testcontainers;
- [x] `mvn -B -ntp verify` verde no gate local do incremento; CI permanece como gate da linha/release.

Tipos MVP:

```text
MULTIPLE_CHOICE
TRUE_FALSE
```

### 13.2 — Respostas estruturadas no `/join`

- [x] ativar `LiveStageType.QUIZ` ao abrir a rodada;
- [x] renderizar questão ativa no `/join`;
- [x] enviar resposta durável por REST com token temporário;
- [x] confirmar envio sem revelar correção antecipadamente;
- [x] permitir alteração enquanto `OPEN` e bloquear após `LOCKED`;
- [x] restaurar Quiz + resposta própria pelo `RUNTIME_SNAPSHOT`;
- [x] manter `QUIZ_STATE` como projeção realtime;
- [x] UI mobile-first com controles nativos acessíveis;
- [x] testes de contrato frontend e `QuizJoinIT` adicionados;
- [x] `npm test`, `npm run typecheck`, `npm run build` e `mvn verify` verdes no gate local do incremento.

### 13.3 — Resultados + Projetor

- [x] painel do professor acompanha `respondidos / presentes / pendentes`;
- [x] professor controla `READY → OPEN → LOCKED → REVEALED → CLOSED`;
- [x] Projetor mostra quantidade de respostas enquanto resultado estiver protegido;
- [x] reveal publica distribuição agregada;
- [x] resposta correta só aparece quando `revealedAt != null`;
- [x] fechar sem reveal mantém distribuição e correção protegidas;
- [x] reload/reconnect do Projetor restaura o mesmo resultado;
- [x] nenhuma identidade canônica é exposta publicamente;
- [x] testes frontend e backend adicionados;
- [x] `npm test`, `typecheck`, `build` e `mvn verify` verdes no gate local do incremento.

### 13.4 — Avaliação + XP

- [x] avaliar `MULTIPLE_CHOICE` e `TRUE_FALSE` no backend ao entrar em `LOCKED`;
- [x] mapear acerto elegível para `ScoreEvent` com `source=QUIZ`;
- [x] impedir XP duplicado com lock pessimista + `evaluated_at` + vínculo ao evento;
- [x] manter reversão exclusivamente no domínio `ScoreEvent`;
- [x] não criar `QuizScore`;
- [x] registrar somente transições da rodada em `SessionEvent`;
- [x] migration `V16__quiz_evaluation_score_event.sql`;
- [x] `QuizScoringIT` cobre avaliação, idempotência, reversão e timeline;
- [ ] `npm test`, `typecheck`, `build` e `mvn verify` verdes para fechar o incremento.

### 13.5 — Feedback pedagógico

- [ ] resumo de acerto/erro;
- [ ] alternativas com maior incidência de erro;
- [ ] ações `Continuar`, `Reexplicar`, `Refazer questão`, `Abrir discussão`;
- [ ] nenhuma ação avança automaticamente.

### 13.6 — Mobile/PWA

- [ ] revisar `/join` em viewport móvel;
- [ ] manifest e installability;
- [ ] shell offline limitado à interface;
- [ ] reconnect explícito;
- [ ] cache nunca é fonte de verdade do domínio.

### 13.7 — Hardening, E2E e release gate v0.5.0

- [ ] E2E de Quiz completo;
- [ ] resposta + reconnect;
- [ ] reveal + Projetor;
- [ ] avaliação + `ScoreEvent`;
- [ ] audit/test/typecheck/build;
- [ ] `mvn verify`;
- [ ] Compose;
- [ ] backup/restore da maior migration;
- [ ] manifests/tooling em `0.5.0`;
- [ ] gate final no mesmo SHA;
- [ ] tag somente depois do gate.

## Fora do escopo inicial

- correção automática por IA;
- respostas discursivas complexas;
- analytics longitudinal;
- badges, streaks e achievements;
- marketplace de questões;
- Redis/Kafka/microservices;
- app mobile nativo.

## Definition of Done

A v0.5 só fecha quando uma `ActivityQuestion` puder ser executada como Quiz, respondida pelo `/join`, restaurada por reconnect, projetada sem vazamento antecipado e avaliada com XP exclusivamente via `ScoreEvent`, com E2E e release gate verdes.
