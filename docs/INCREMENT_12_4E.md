# 12.4E — Orquestração Live Flow ↔ Live Stage

**Data:** 08/09/2026  
**Status:** implementado localmente; gate Maven/Compose pendente no ambiente normal.

## Objetivo

Conectar o roteiro autorado (`ActivityStep`) ao palco compartilhado (`LiveStageState`) sem criar um segundo runtime para Slide, Questão, Nuvem ou Poll.

```text
ActivityStep
    │
    ├── SLIDE ──────► Live Stage
    ├── QUESTION ───► Live Stage
    ├── WORD_CLOUD ─► WordCloud runtime ─► Live Stage
    └── POLL ───────► Poll runtime ───────► Live Stage
```

Princípio: **o roteiro define a sequência; os runtimes especializados definem a mecânica; o Live Stage define o que está visível agora.**

## Decisões implementadas

### 1. Slide e Questão passam a possuir projeção própria

`LiveStageService` agora resolve blocos autorados a partir do `ActivityStep` e publica somente conteúdo adequado ao palco:

- `SLIDE`: título, instruções e conteúdo do slide;
- `QUESTION`: enunciado, tipo, pontos, opções, código e linguagem;
- respostas corretas, explicação e critérios de correção não entram na projeção pública.

`SLIDE` usa audiência `PROJECTOR`; `QUESTION` usa `BOTH`.

### 2. Word Cloud e Poll reutilizam os runtimes existentes

O runtime `SessionDynamic.ARENA` passa a guardar um mapa opaco:

```text
stepRuntimeIds
stepId → roundId
```

Ao entrar pela primeira vez em um bloco `WORD_CLOUD` ou `POLL`, o runtime especializado cria a rodada. Ao voltar para o mesmo bloco com `Anterior/Próximo`, o backend reativa **a mesma rodada** no palco em vez de criar outra.

Isso evita duplicar domínio e mantém respostas/votos associados ao runtime original daquele step.

### 3. Nenhum evento de dinâmica avança o roteiro

Reveal, close, voto, submissão, Timer ou qualquer outro evento especializado não altera `currentStepId/currentStepPosition`.

Somente comandos explícitos do professor continuam avançando ou voltando:

```text
POST .../flow/start
POST .../flow/previous
POST .../flow/next
```

### 4. Boss Battle recebe adapter de palco

Ao iniciar um Boss, `MechanicsService` ativa `BOSS_BATTLE` no mesmo `LiveStageState`.

O detalhamento visual completo do Boss continua separado do escopo deste incremento e pode evoluir no 12.4F sem mudar a fonte de verdade do palco.

### 5. Timer continua transversal

A orquestração não cria um timer por step. O timer atual permanece overlay transversal do Live Stage.

### 6. Contrato Poll alinhado

O editor permitia até 8 opções enquanto o runtime de Poll aceita 6. O contrato autoral foi alinhado para **2–6 opções**, evitando roteiros válidos no editor mas impossíveis de executar.

## Backend

Arquivos centrais:

- `activity/ActivityStepRepository.java`;
- `dynamic/MechanicsService.java`;
- `stage/LiveStageService.java`;
- `wordcloud/WordCloudService.java`;
- `poll/PollService.java`.

Não há migration nova. `stepRuntimeIds` permanece dentro do JSON autoritativo de `SessionDynamic.ARENA`.

## Frontend

### Projetor

Passa a renderizar:

- Slides do roteiro;
- Questões sem resposta/explicação;
- Boss Battle como palco reconhecido;
- Timer continua podendo aparecer como overlay.

### `/join`

Passa a renderizar `QUESTION` quando a audiência do palco inclui participantes. Slides continuam exclusivos do projetor.

## Testes

`LiveFlowIT` cobre:

- Slide → palco `SLIDE`;
- Questão → palco `QUESTION`;
- criação de Word Cloud/Poll no primeiro acesso;
- reativação da mesma rodada ao retornar ao step;
- reveal da Nuvem sem avanço automático;
- restauração do step atual.

`LiveStageIT` cobre o adapter de Boss e a política de audiência.

Frontend:

```text
npm test      73/73
npm typecheck OK
```

Backend main:

```text
javac --release 21 OK
```

O gate completo `mvn -B -ntp verify` e Docker Compose deve ser executado no ambiente normal antes do commit.

## Próximo

`12.4F — Consolidação pública /join + Projetor`:

- reconexão restaurando integralmente palco + estado especializado;
- acabamento dos adapters públicos;
- detalhamento visual do Boss;
- preparar caminho para Quiz quando houver runtime próprio.
