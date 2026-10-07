# Handoff — Arena Dev v0.9

**Origem:** v0.8.0 publicada e congelada
**Tag:** `v0.8.0`
**Merge da v0.8:** `03bf09c35b58878bc22ba43ad114d7b9080e4923`
**PR de fechamento:** #28
**Data do handoff:** 06/10/2026

---

## 1. Estado confirmado da v0.8

A v0.8.0 está encerrada. Não reabrir seu escopo funcional.

- backend, frontend e Compose/E2E verdes;
- gate local com 21/21 E2E;
- backup/checksum restaurado em PostgreSQL 17;
- Flyway validado até V38;
- Biblioteca Semântica 16.5C–F concluída no escopo MVP;
- README, docs e Notion sincronizados;
- GitHub Release v0.8.0 publicada.

A linha `v0.8.x` fica restrita a regressão, segurança, acessibilidade crítica e documentação.

## 2. Fronteiras de produto

- **Jornada:** estudo sequencial, progressão e validação.
- **Atividades:** fazer, produzir, entregar e receber avaliação.
- **Arena:** condução da aula ao vivo.
- **Biblioteca:** conteúdo canônico e reutilizável.

A v0.9 não deve transformar a Arena em LMS genérico nem misturar esses domínios.

## 3. Objetivo da v0.9

Transformar a Arena de um conjunto de ferramentas independentes em um **sistema coerente de orquestração da aula ao vivo**, com infraestrutura compartilhada para interação e resultados.

Fluxo-alvo:

```text
conteúdo → interação → resposta → resultado → intervenção → nova evidência
```

**Tese:** não adicionar novas dinâmicas independentes antes de consolidar um Interaction Engine reutilizável.

## 4. Princípios

1. Não reescrever a Arena.
2. Migrar por adapters/strangler, não por big bang.
3. Backend continua autoridade de sessão/realtime.
4. Não duplicar lógica entre Quiz, Poll, Nuvem e futuros tipos de resposta.
5. Acessibilidade, responsividade, light/dark e reconnect continuam requisitos de baseline.
6. Gamificação permanece contextual, não moeda central do produto.
7. Não introduzir Mastery obscuro na v0.9.

## 5. Recursos atuais e decisão

| Recurso | Decisão v0.9 |
|---|---|
| Grid | manter como infraestrutura |
| Spotlight/Sorteio | manter e evoluir participação equilibrada |
| Roleta | manter como apresentação opcional |
| Timer | manter e integrar às interações |
| Participantes/Presença | manter como estado da sessão |
| QR/Código | manter |
| Grupos | ampliar |
| Quiz | migrar progressivamente para Interaction Engine |
| Poll/Votação | absorver como Interaction sem resposta correta |
| Nuvem | absorver como visualização de resposta aberta |
| Buzzer | manter, baixa prioridade arquitetural |
| Ranking/Pontuação | manter contextual/opcional |
| Boss | congelar na v0.9 |

## 6. Arquitetura-alvo

```text
ArenaSession
├── Participants
├── Groups
├── Timer
├── Realtime
└── InteractionSession
    ├── Interaction
    ├── Responses
    ├── Result
    └── EvidenceBoundary
```

### Interaction — contrato inicial

- `prompt`
- `responseType`
- `evaluationMode`
- `displayMode`
- `sourceContentId?`
- `topic?`
- `competency?`
- `timer?`
- `scoring?`

### Response types iniciais

`SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE`, `SHORT_TEXT`, `OPEN_TEXT`, `SCALE`.

Deixar `ORDERING`, `MATCHING`, `HOTSPOT`, `DRAWING` e `CODE` para evolução posterior.

### EvaluationMode

`NONE`, `CORRECT_ANSWER`, `MANUAL`.

### DisplayMode

`BARS`, `LIST`, `WORD_CLOUD`, `DISTRIBUTION`, `HIDDEN`.

Assim, Word Cloud vira visualização e Poll vira interação sem resposta correta.

## 7. Sequência de implementação

### 9.1 — Interaction Foundation

- criar `Interaction`, `InteractionSession`, `InteractionResponse` e contratos de resultado;
- implementar tipos/evaluation/display modes iniciais;
- testes unitários;
- nenhuma mudança visual ampla.

### 9.2 — Quiz Adapter

- adaptar o Quiz existente ao novo contrato;
- preservar UX, realtime, reconnect, scoring e Projector;
- manter compatibilidade temporária com contratos antigos;
- só considerar o engine validado quando o Quiz real estiver operando sobre ele.

### 9.3 — Result Engine

Centralizar participação, respostas, distribuição, acerto/erro quando aplicável e sem resposta.

### 9.4 — Poll + Open Response

- Poll → `evaluationMode = NONE`;
- resposta aberta no mesmo motor;
- Nuvem → `displayMode = WORD_CLOUD`;
- remover legado apenas depois de testes/E2E e ausência de consumidores.

### 9.5 — Groups & Orchestration

- aleatório;
- número/tamanho de grupos;
- ajuste manual;
- evitar repetição quando possível;
- integração com Timer;
- preparar agrupamento por resposta, sem depender de Mastery.

### 9.6 — Evidence Boundary mínimo

Registrar `studentId`, `interactionId`, `topic/competency/sourceContent` opcionais, resultado, timestamp e contexto. Não construir algoritmo de Mastery nesta versão.

## 8. Fora do escopo da v0.9

- Mastery avançado;
- Confidence Score completo;
- Before & After / Peer Instruction completo;
- Clínica do Erro automatizada;
- Recovery Round;
- geração de questões por IA;
- RAG/embeddings/vector store;
- banco de questões completo;
- Knowledge Graph/taxonomia rígida;
- Boss novo e novos game modes;
- XP/moedas/power-ups como sistema central;
- marketplace/batch reuse;
- anti-cheat tratado como segurança real de browser.

## 9. Próximas versões

- **v0.10 — Learning Loop:** Evidence, confiança, Before & After, Peer Instruction, Clínica do Erro, agrupamento por resposta, Meta Coletiva e recuperação.
- **v0.11 — Content Intelligence:** Biblioteca → questões, banco de questões, proveniência, IA assistida, Arena → Mastery/Journey.
- **v0.12 — Active Learning:** Missions, entregas em grupo, questões criadas pelo aluno, justificativas e tipos ricos de resposta.

## 10. Primeiro slice técnico

Não começar pela UI.

1. partir de `main`;
2. mapear Quiz/Poll/Nuvem e boundaries existentes;
3. revisar `useArenaSessionRuntime`, `useArenaRealtime`, `useArenaPresence`, `useArenaScoring` e componentes atuais de Quiz;
4. criar contratos do Interaction Engine;
5. escrever testes;
6. implementar Quiz Adapter;
7. executar regressão completa;
8. só então alterar UI se necessário.

Branch sugerida:

```bash
git checkout main
git pull origin main
git checkout -b feat/v0.9-interaction-foundation
```

## 11. Estratégia de migração

```text
Quiz atual → QuizAdapter → Interaction Engine → Result Engine
```

Depois: Poll, Open Text e Word Cloud passam pelo mesmo motor.

Remover contratos antigos somente após cobertura, E2E, CI verde e ausência de consumidores.

## 12. Invariantes técnicos

- backend continua autoridade de sessão;
- eventos realtime devem ser idempotentes quando necessário;
- resposta não pode duplicar score;
- reconnect deve preservar estado;
- Projector consome o mesmo estado da sessão;
- tema/viewport não alteram estado lógico;
- Journey não depende do WebSocket da Arena;
- Library não depende da sessão ao vivo;
- dado derivado não substitui fonte de verdade.

## 13. Gates obrigatórios

Preservar a baseline da v0.8.0:

- backend unit/integration;
- frontend tests;
- typecheck;
- production build;
- `git diff --check`;
- Compose isolado;
- Chromium E2E;
- mobile + ultrawide nos fluxos alterados;
- light/dark;
- reconnect quando realtime;
- documentação e Notion sincronizados.

## 14. Métricas que devem orientar o produto

1. **Participação:** percentual da turma que interagiu.
2. **Evidência:** quantos alunos produziram evidência utilizável.
3. **Evolução:** mudança após uma intervenção.
4. **Fricção docente:** ações necessárias para iniciar uma interação.
5. **Reuso:** uso de conteúdo/questões já existentes.

## 15. Definition of Done da v0.9

- Interaction Engine estável e testado;
- Quiz real operando sobre o motor;
- Poll e resposta aberta no mesmo motor;
- Nuvem como visualização, sem domínio duplicado;
- resultados centralizados;
- grupos integrados à orquestração;
- boundary mínimo de evidência criado;
- nenhum fluxo crítico da v0.8 regrediu;
- CI/E2E verde;
- documentação reflete a arquitetura real.

## 16. Prompt para continuidade em outro chat

> Estamos iniciando a Arena Dev v0.9. A v0.8.0 está publicada, tagueada e congelada no merge `03bf09c`; não reabra seu escopo. Leia `docs/HANDOFF_V0_9.md`, `docs/ROADMAP_0_8.md`, `docs/STATUS_ATUAL.md`, `docs/RELEASE_0_8.md` e os ADRs relevantes antes de alterar código.
>
> A prioridade da v0.9 é consolidar a Arena ao vivo em torno de um Interaction Engine reutilizável, sem reescrever o runtime existente e sem adicionar novas dinâmicas de baixo valor. Comece pelo slice 9.1 — Interaction Foundation, mapeando primeiro Quiz/Poll/WordCloud e os boundaries atuais de sessão/realtime/score. Depois implemente o adapter do Quiz como prova da arquitetura.
>
> Preserve as fronteiras: Jornada = estudo sequencial; Atividades = fazer/entregar; Arena = ao vivo; Biblioteca = conteúdo reutilizável. Use migração progressiva, testes e E2E. Não implemente Mastery avançado, RAG, Boss novo, novos game modes ou IA de geração nesta primeira etapa.
