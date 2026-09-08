# Incremento 12.4D.0 — Live Stage, Dinâmicas e identidade de exibição

**Data:** 08/09/2026
**Branch:** `feat/v0.4-live-classroom`
**Status:** 12.4D.0A–D concluídos localmente; adapters de palco seguem incrementais por dinâmica.

## Motivação

Projector, `/join`, Sorteio, Nuvem, Buzzer, Timer e Poll não devem manter flags globais concorrentes nem decidir isoladamente o que ocupa a aula. Eles são projeções ou mecânicas do **estado atual da sessão**.

A fundação introduz um único estado autoritativo de apresentação:

```text
Professor
   │ controla
   ▼
LiveStageState
   ├── primary: um único palco principal
   ├── audience: PROJECTOR | PARTICIPANTS | BOTH
   └── overlays.timer
        ├──────────────► /projector — visão pública
        └──────────────► /join      — visão individual
```

Professor, Projetor e participante compartilham o mesmo fato de domínio, mas **não recebem necessariamente o mesmo payload**.

## 12.4D.0A — Live Stage / Presentation State

### Implementado

- `DynamicType.LIVE_STAGE` persistido em `session_dynamics`;
- sem nova migration: a unicidade existente `(session_id, type)` garante um único registro de palco por sessão;
- tipos preparados: `IDLE`, `DRAW`, `SLIDE`, `QUESTION`, `QUIZ`, `WORD_CLOUD`, `POLL`, `BUZZER`, `BOSS_BATTLE`, `TIMER`;
- `LiveStageAudience`: `PROJECTOR`, `PARTICIPANTS`, `BOTH`;
- Timer como overlay transversal (`overlays.timer`) e possibilidade de foco principal `TIMER`;
- API administrativa:
  - `GET /api/sessions/{sessionId}/stage`;
  - `PUT /api/sessions/{sessionId}/stage`;
  - `POST /api/sessions/{sessionId}/stage/idle`;
- evento realtime único `LIVE_STAGE_STATE`;
- canais separados para professor, participantes e Projetor;
- snapshot inicial de `/projector` inclui `stage`;
- conexão realtime de professor, participante e projetor recebe sua projeção de `LIVE_STAGE_STATE`.

### Regra de projeção

O estado persistido é único. O backend resolve a projeção adequada antes de transmitir.

Exemplo de Sorteio:

```text
Teacher projection
primary.type      = DRAW
primary.sourceId  = <student UUID>
primary.displayName = "Jota"

Projector / participant projection
primary.type      = DRAW
primary.sourceId  = null
primary.displayName = "Jota"
```

O cliente público não recebe o UUID do aluno para decidir o nome que será exibido.

## 12.4D.0B — Dinâmicas e navegação

### Implementado nesta primeira passagem

- label visual `Interações` → `Dinâmicas`;
- ID interno da tab continua `interactions` para evitar refatoração sem valor funcional;
- Sorteio foi movido de `Condução` para `Dinâmicas`;
- modos atuais da área: Sorteio, Nuvem de Palavras e Buzzer;
- Sorteio autoritativo ativa `DRAW` no palco;
- abertura da Nuvem ativa `WORD_CLOUD`;
- abertura do Buzzer ativa `BUZZER`;
- Projetor renderiza Sorteio, Nuvem e Buzzer a partir do `primary.type`;
- `/join` habilita a interação correspondente ao mesmo `primary.type`;
- Timer permanece overlay e mantém fallback compatível para sessões ainda em `IDLE`.

### Deliberadamente não concluído neste incremento

`SLIDE`, `QUESTION`, `BOSS_BATTLE`, `QUIZ` e `POLL` já pertencem ao vocabulário do Live Stage, mas só devem assumir o palco quando houver adapter completo de estado + projeção + UI. Não ativar um tipo sem renderer correspondente.

Os eventos especializados (`WORD_CLOUD_STATE`, `BUZZER_STATE`, `TIMER_STATE`) continuam existindo. O `LIVE_STAGE_STATE` responde **qual dinâmica está no palco**; cada módulo especializado continua responsável por seu estado detalhado. Isso evita transformar Live Stage em um event bus genérico ou payload monolítico.

## Privacidade do Buzzer no Projetor

O Buzzer possuía payload administrativo com identificadores e nomes completos. A projeção pública passa a ser própria:

```text
position
displayName
receivedAt
```

O Projetor não precisa receber IDs internos para montar o ranking visual.

## 12.4D.0C — Identidade de exibição — concluído localmente

Modelo implementado:

```text
Student
├── name               identidade canônica
└── nickname           legado/compatibilidade

Enrollment
└── preferredName      nome de exibição naquela turma
```

- migration `V11__enrollment_preferred_name.sql`;
- backfill do `Student.nickname` legado para preservar a experiência existente;
- `DisplayNameService` centraliza `FULL_NAME`, `FIRST_NAME`, `PREFERRED_NAME`, `FIRST_OR_PREFERRED` e `ANONYMOUS`;
- Sorteio, Buzzer e Join recebem `displayName` resolvido no backend;
- editar `preferredName` não altera a identidade canônica de `Student`;
- `Student.nickname` permanece apenas como ponte de compatibilidade e pode ser descontinuado em etapa posterior.

## 12.4D.0D — Reconhecimento de dispositivo — concluído localmente

Separação implementada:

```text
Enrollment
   └── DeviceClaim opaco e persistente
             ↓ troca
ClassSession
   └── participant token temporário
```

- migration `V12__enrollment_device_claims.sql`;
- claim opaco associado à matrícula, nunca contendo nome/matrícula legível;
- expiração renovável e revogação explícita;
- `localStorage` guarda somente o claim persistente por turma;
- `sessionStorage` guarda somente o participant token da aula atual;
- reconhecimento exibe `Entrar como {displayName}?`;
- `Não sou {displayName}` remove o claim local e solicita revogação;
- claim reconhecido **não** autentica Buzzer, Poll ou WebSocket diretamente: o backend emite um novo participant token da sessão atual.

## Poll depois da fundação

Com 0C/0D concluídos, o Poll foi implementado no incremento seguinte:

```text
12.4D.1 — Poll/Votação em runtime
├── PollRound + PollOption + PollVote
├── single-choice MVP
├── um voto por participante/rodada
├── resultado agregado/anônimo
├── /join para votar
└── /projector para resultado
```

## Validação local desta fundação

Frontend em 08/09/2026, após identidade + Poll:

```text
npm test          73/73 OK
npm run typecheck OK
npm run build     OK
```

Backend:

```text
javac --release 21 sobre todos os fontes main: OK
```

Foram adicionados `LiveStageIT`, `DeviceClaimIT` e `PollIT` para o gate normal de integração. Neste ambiente de trabalho não há Maven nem Docker disponíveis, portanto `mvn verify` e Compose **ainda precisam ser executados no ambiente normal/CI antes do commit ser tratado como gate completo**.
