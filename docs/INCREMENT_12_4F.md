# 12.4F — Consolidação pública `/join` + Projetor e reconnect

**Data:** 08/09/2026  
**Status:** implementado localmente; gate Maven/Compose pendente no ambiente normal.

## Objetivo

Consolidar as experiências públicas do Arena Dev sobre o estado autoritativo já criado em 12.4D/12.4E, com foco em reconexão, restauração íntegra do palco, privacidade e fallback visual.

```text
WebSocket reconnect
      │
      ├── autentica audiência
      │
      └── RUNTIME_SNAPSHOT
              ├── Live Stage
              ├── Buzzer público
              ├── Timer
              ├── Word Cloud
              ├── Poll
              ├── Boss
              └── estado privado do participante quando aplicável
```

Princípio: **reconectar deve restaurar estado, não reexecutar comandos de domínio.**

## Decisões implementadas

### 1. `RUNTIME_SNAPSHOT` atômico

Após autenticação do Projetor ou participante, o backend envia um único `RUNTIME_SNAPSHOT` com o estado corrente necessário àquela audiência.

Isso substitui a restauração inicial baseada em vários frames independentes, que podia produzir uma janela transitória com palco novo e runtime especializado ainda antigo.

Eventos incrementais (`LIVE_STAGE_STATE`, `POLL_STATE`, `WORD_CLOUD_STATE`, `BUZZER_STATE`, `BOSS_STATE`, `TIMER_STATE`) continuam existindo para mudanças após o snapshot.

### 2. Projetor REST já nasce completo

`GET /api/projector/{code}` agora retorna os metadados públicos da sessão e um `runtime` composto com:

- Live Stage projetado;
- Buzzer público;
- Timer;
- Word Cloud;
- Poll público;
- Boss público.

Assim, o primeiro paint não depende do WebSocket para completar o palco.

### 3. Buzzer público não recebe identidade administrativa

O Buzzer foi corrigido para separar:

```text
Professor       → BuzzerStateView administrativo
Projetor/join   → PublicBuzzerStateView
Participante    → posição própria em BuzzerParticipantState
```

A projeção pública não carrega `participantId`, `studentId`, nome canônico ou nickname.

O participante recebe sua posição separadamente, sem precisar receber os IDs dos colegas.

### 4. Falha de autenticação encerra o canal corretamente

Falhas em `AUTH_PARTICIPANT` e `AUTH_PROJECTOR` agora geram:

```text
AUTH_FAILED
+
WebSocket close 1008 / POLICY_VIOLATION
```

Isso impede loops de reconnect com credencial já inválida.

No `/join`, quando existe device claim opaco válido, o cliente tenta trocar o claim por um novo participant token antes de pedir identificação manual novamente.

### 5. Reconnect com backoff

`/join` e Projetor deixam de reconectar em intervalo fixo.

A política é progressiva e limitada:

```text
1s → 2s → 4s → 8s → 10s → 10s...
```

Ao reconectar, o último palco permanece visível com aviso de sincronização interrompida. A UI não volta artificialmente para `IDLE`.

### 6. Estado `online` somente após `AUTH_OK`

Abertura do socket TCP/WebSocket não significa autorização concluída.

No `/join`, ações interativas só são reabilitadas depois de `AUTH_OK`, evitando voto/Buzzer/submissão durante a janela entre `onopen` e autenticação do participante.

### 7. Boss sincronizado ponta a ponta

`MechanicsService` passa a publicar `BOSS_STATE` após criação e dano.

O snapshot público também contém:

```text
name
maxHp
currentHp
```

Projetor e `/join` mostram HP e progresso sem criar outro runtime de Boss.

### 8. Camada visual pública compartilhada

Foi adicionada:

```text
frontend/styles/public-live.css
```

Ela concentra estados transversais usados por `/join` e Projetor:

- aviso de reconnect;
- barra de HP do Boss;
- estado de Boss derrotado;
- comportamento com `prefers-reduced-motion`.

## Backend

Arquivos centrais:

- `realtime/SessionRuntimeSnapshotService.java`;
- `realtime/SessionSocketHandler.java`;
- `realtime/BuzzerService.java`;
- `dynamic/MechanicsService.java`;
- `projector/ProjectorController.java`.

Não há migration nova. O schema permanece em `V13`.

## Frontend

Arquivos centrais:

- `lib/runtime-snapshot.ts`;
- `app/join/page.tsx`;
- `components/ProjectorView.tsx`;
- `lib/projector-api.ts`;
- `styles/public-live.css`.

## Testes

Frontend cobre:

- backoff progressivo e limite;
- consumo do `RUNTIME_SNAPSHOT`;
- restauração de estados privados de Word Cloud/Poll/Buzzer;
- recuperação via device claim;
- manutenção do último palco durante reconnect;
- Boss sincronizado no Projetor e `/join`.

Gate local:

```text
npm test          81/81 OK
npm run typecheck OK
npm run build     OK
```

Backend `main`:

```text
javac --release 21 OK
```

Também foram ajustados/adicionados testes Java para:

- snapshot público/participante;
- ausência da projeção administrativa do Buzzer no participante;
- `AUTH_FAILED` com close `POLICY_VIOLATION`;
- Projector REST com Boss sincronizado.

O gate completo `mvn -B -ntp verify` e Compose/Testcontainers deve ser executado no ambiente normal antes do commit.

## Próximo

Com o bloco público consolidado, a sequência recomendada passa a ser:

```text
12.5 — SessionEvent / linha do tempo operacional
↓
12.6 — Hardening, E2E, segurança, observabilidade e gate v0.4.0
```

`QUIZ` continua deliberadamente fora do adapter até existir runtime próprio.
