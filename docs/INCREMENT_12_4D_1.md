# Incremento 12.4D.1 — Poll / Votação em runtime

**Data:** 08/09/2026
**Branch:** `feat/v0.4-live-classroom`
**Status:** implementado localmente; aguarda `mvn verify` + Compose/CI no ambiente normal.

## Objetivo

Adicionar votação single-choice como uma dinâmica real da sessão, reutilizando a fundação do Live Stage sem transformar o palco em um payload monolítico.

```text
Professor cria/controla
        ↓
Poll runtime autoritativo
        ├── POLL_STATE teacher
        ├── POLL_STATE public agregado
        └── POLL_PARTICIPANT_STATE privado
                 ↓
      LiveStageState.primary = POLL
             ↙          ↘
        /projector      /join
```

## Persistência

Migration `V13__poll_runtime.sql`:

```text
poll_rounds
├── session_id
├── prompt
├── status: OPEN | REVEALED | CLOSED
└── live_results

poll_options
├── round_id
├── label
└── position

poll_votes
├── round_id
├── participant_id
└── option_id
```

Regras no banco:

- uma única votação aberta/revelada por sessão;
- uma única posição de opção por rodada;
- **um voto por participante por rodada** por constraint única;
- votos/opções são ligados à rodada por FK.

## Contratos

Professor usa REST protegido por sessão/CSRF:

```text
GET  /api/sessions/{sessionId}/poll
POST /api/sessions/{sessionId}/poll
POST /api/sessions/{sessionId}/poll/{roundId}/reveal
POST /api/sessions/{sessionId}/poll/{roundId}/close
```

O participante **não possui endpoint REST público de voto**. O voto usa o WebSocket já autenticado pelo participant token:

```json
{ "type": "POLL_VOTE", "optionId": "..." }
```

O backend devolve ao mesmo participante:

```text
POLL_PARTICIPANT_STATE
├── roundId
├── canVote
└── selectedOptionId
```

## Privacidade e projeções

O professor sempre recebe contagens agregadas para conduzir a aula.

Em `liveResults = false`:

- `/join` e `/projector` recebem `totalVotes`;
- `voteCount` e `percentage` ficam `null` até Reveal/Close;
- nenhuma identidade de votante é enviada ao Projetor;
- o voto individual só aparece no `POLL_PARTICIPANT_STATE` privado do participante.

Em `liveResults = true`, a distribuição agregada é publicada em tempo real.

## UI

### Professor — Arena → Dinâmicas → Votação

- pergunta com até 280 caracteres;
- 2–6 opções, até 160 caracteres cada;
- resultados ao vivo ou protegidos;
- métricas de presentes, votos e pendentes;
- revelar, encerrar, abrir Projetor e criar nova votação.

### `/join`

- opções votáveis somente quando o WebSocket está autenticado/online;
- um voto por rodada;
- confirmação visual do voto escolhido;
- distribuição exibida somente quando a política pública permitir.

### `/projector`

- pergunta e contagem de votos;
- estado protegido enquanto o professor não revelar;
- barras/percentuais agregados quando públicos;
- Timer continua disponível como overlay transversal.

## Live Stage

Criar a votação chama `LiveStageService.showPoll(sessionId, roundId)` e define:

```text
primary.type = POLL
primary.sourceId = roundId   // somente onde a projeção permite
```

`POLL_STATE` continua responsável pelos dados detalhados da votação. O Live Stage apenas orquestra qual dinâmica ocupa o palco.

## Concorrência

- participante e rodada são lidos sob lock pessimista no caminho de voto;
- a constraint `(round_id, participant_id)` continua sendo a garantia final no banco;
- queries com `PESSIMISTIC_WRITE` não fazem fetch join, evitando `FOR UPDATE` com `DISTINCT/LEFT JOIN` no PostgreSQL;
- repetir a mesma opção é idempotente; tentar trocar o voto é rejeitado no MVP.

## Validação local

Frontend:

```text
npm test          73/73 OK
npm run typecheck OK
npm run build     OK
```

Backend:

```text
javac --release 21 em todos os fontes main: OK
```

Testes adicionados para o gate normal:

- `PollIT` — visibilidade protegida, reveal, unicidade/idempotência, close/finalização e ativação do Live Stage;
- testes de contrato frontend de `poll-api` e frame `POLL_VOTE`;
- `SecurityAndMigrationIT` atualizado para migrations `V1..V13` e 23 tabelas operacionais esperadas.

**Limitação do ambiente atual:** Maven e Docker não estão instalados, portanto `mvn -B -ntp verify` e Testcontainers/Compose ainda precisam rodar no ambiente de desenvolvimento normal ou CI antes de commit/release.

## Próximo incremento

`12.4E — orquestração progressiva Live Flow ↔ Live Stage`, começando por conectar os steps já autorados (`SLIDE`, `QUESTION`, `WORD_CLOUD`, `POLL`) aos adapters de execução sem criar uma nova arquitetura paralela.
