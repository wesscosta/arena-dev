# Arena Dev Community

**Arena Dev Community** é uma plataforma open source e self-hosted para condução, participação e gamificação de dinâmicas de sala, com foco em baixa fricção para o professor.

> **Baseline publicada:** `v0.7.0 — Educational Integrations`.
>
> **Linha ativa:** `v0.8 — Professor Experience & Journey MVP`.
>
> **Execução atual:** `16.0 — Professor Arena Experience` na branch `feat/v0.8-professor-arena-cockpit`.

## Modelo do produto

```text
Visão geral = nível do sistema
Turma       = contexto pedagógico
Arena       = operação da aula ao vivo
Entregas    = fluxo assíncrono de submissão, correção e feedback
Integrações = ponte provider-independent com plataformas educacionais
```

Arena Dev não pretende ser um LMS completo. O produto concentra a condução da aula, participação dos estudantes, atividades, entregas, avaliação supervisionada e gamificação.

## Capacidades principais

### Turma e Arena
- turmas, estudantes, matrículas e presença;
- sessão de aula com estado autoritativo no backend;
- Sorteio, Nuvem de Palavras, Votação, Quiz, Buzzer e Boss Battle;
- Timer sincronizado;
- grupos, duplas e trios;
- Projetor público;
- entrada do aluno por `/join`;
- ranking e histórico;
- XP auditável por `ScoreEvent`;
- timeline operacional por `SessionEvent`.

### Atividades e entregas — baseline v0.6
- `ActivitySubmission` como fonte de verdade interna da entrega;
- `SubmissionItem` polimórfico para `QUESTION_RESPONSE`, `TEXT`, `LINK`, `CODE` e referências de artefatos;
- autosave, restauração e envio;
- dashboard de entregas por atividade;
- correção individual com navegação entre estudantes;
- rubricas e critérios estruturados;
- avaliação manual separada de XP;
- correção assistida por IA sob supervisão;
- feedback individual com publicação explícita;
- preparação/triagem em lote sem autopublicação;
- evidências de processo e recomendação de revisão humana;
- fundação provider-independent para Microsoft Teams e Google Classroom.

## Invariantes de domínio

```text
ActivityQuestion     = autoria da pergunta
QuizRound            = runtime do Quiz ao vivo
ParticipantAnswer    = verdade da resposta do Quiz
ActivitySubmission   = entrega interna da atividade
SubmissionItem       = conteúdo persistido da entrega
SubmissionAssessment = avaliação da entrega
ScoreEvent           = verdade do XP
LiveStage            = estado público/apresentado
SessionEvent         = timeline operacional
```

A nota da avaliação não substitui `ScoreEvent`. XP continua sendo derivado exclusivamente de eventos de pontuação.

## IA supervisionada

A IA pode sugerir análise, pontuação por critério e feedback, mas não é autoridade da avaliação.

```text
entrega
  ↓
sugestão da IA
  ↓
professor revisa/edita/descarta
  ↓
avaliação docente
  ↓
publicação explícita
  ↓
aluno recebe publishedFeedback
```

Rascunhos, notas privadas e sugestões da IA não são publicados automaticamente nem sincronizados externamente.

## Evidências de processo

A v0.6 registra sinais operacionais para apoiar revisão humana, como eventos de salvamento, colagem, envio, tempo e similaridade textual.

Esses sinais **não** constituem detector de IA, plágio ou fraude. O sistema produz apenas recomendação de revisão (`LOW`, `MEDIUM`, `HIGH`).

## Integrações externas — v0.7

A v0.7 transforma a fundação provider-independent da v0.6 em uma camada operacional de integrações:

```text
Teams / Classroom
        ↓
Provider Adapter
        ↓
Integration Core
        ↓
Arena Dev Domain
```

Regra arquitetural: IDs, tokens e detalhes específicos de Microsoft/Google não devem contaminar `ActivitySubmission`, `Assessment`, `ScoreEvent` ou os demais agregados centrais.

A v0.7 foi encerrada com Microsoft Teams operacional sobre o Integration Core provider-independent. Google Classroom permanece em standby e não bloqueou a publicação da v0.7.0.

## Arquitetura

```mermaid
flowchart LR
    T["Professor"] --> F["Next.js 16 + React 19"]
    S["Aluno /join"] --> F
    P["Projetor"] --> F
    F -->|"REST"| B["Java 21 + Spring Boot 4.1"]
    F <-->|"WebSocket"| B
    B --> D["PostgreSQL 17 + Flyway V1–V27"]
```

Princípios:

- monólito modular;
- REST para estado durável e comandos;
- WebSocket para sincronização imediata;
- backend autoritativo para sessão, XP e runtimes;
- PostgreSQL/Flyway como fonte de verdade persistente;
- integrações externas por contratos/adapters;
- evitar Redis, Kafka, Kubernetes e microserviços sem necessidade demonstrada.

## v0.6.0 — linha encerrada

```text
14.0  Bootstrap e arquitetura                         concluído
14.1  ActivitySubmission                              concluído
14.2  SubmissionItem + autosave + envio              concluído
14.3  Dashboard de entregas                           concluído
14.4  Correção individual                             concluído
14.4A Visibilidade/navegação de entregas              concluído
14.4B Fluxo visual do aluno                           concluído
14.5  Rubricas e avaliação estruturada                concluído
14.6  AI-assisted grading                             concluído
14.7  Feedback individual                             concluído
14.8  Correção em lote / triagem                      concluído
14.9  Evidências de processo e integridade            concluído
14.10 Preparação Teams/Classroom                      concluído
14.11 Hardening, E2E e release gate                   concluído
14.11A–C Polish final de UI                           concluído
```

Schema consolidado da linha: **Flyway V1–V25**.

## v0.7.0 — linha tecnicamente concluída

```text
15.0  Integration Core Consolidation                  concluído
15.1  Microsoft Identity + Graph Connection           concluído
15.2  Teams Classrooms & Students                     concluído
15.3  Activity Mapping                                concluído
15.4  Submission Import                               concluído
15.5  Grade & Feedback Sync                           concluído
15.6  Google Classroom Adapter                        standby
15.7  Integration Operations UI                       concluído
15.8  Conflict Resolution & Observability             concluído
15.9  Hardening, E2E & Release Gate                   concluído
```

Detalhes de fechamento em `docs/RELEASE_0_7.md`.

## v0.8 — linha ativa

A v0.8 começa pela reestruturação da experiência do professor antes de avançar para a Jornada do aluno.

Estado atual do `16.0 — Professor Arena Experience`:

- Arena orientada por ações, sem as tabs antigas de Condução/Dinâmicas/Tempo/Organização;
- sidebar persistente para Dinâmicas e Ferramentas;
- workspace full-width e rail contextual de participantes/sessão;
- Timer, Organização e Presença em ferramentas contextuais;
- Pontuação Rápida transversal;
- Sorteio Inteligente 2.0 com seleção autoritativa no backend;
- roleta SVG com segmentos reais, modo estático e carrossel adaptativo para turmas maiores;
- fidelidade visual do Sorteio ainda em refinamento.

Roadmap e estado detalhado em `docs/ROADMAP_0_8.md` e `docs/INCREMENT_16_0.md`.

## Executando localmente

```bash
git clone https://github.com/wesscosta/arena-dev.git
cd arena-dev
cp .env.example .env
docker compose up -d --build
docker compose ps
```

Frontend: `http://localhost:3000`

Backend: `http://localhost:8080`

Readiness: `http://localhost:8080/api/health/ready`

Liveness: `http://localhost:8080/api/health/live`

## Gates de desenvolvimento

Backend:

```bash
cd backend
mvn -B -ntp verify
```

Frontend:

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

Gate local:

```bash
scripts/release/release-gate.sh local
```

O histórico detalhado de release permanece em `docs/RELEASE_0_6.md`. A documentação não deve afirmar tag/GitHub Release sem evidência verificável no mesmo SHA.

## Documentação corrente

- [`docs/STATUS_ATUAL.md`](docs/STATUS_ATUAL.md)
- [`docs/ROADMAP_0_8.md`](docs/ROADMAP_0_8.md)
- [`docs/INCREMENT_16_0.md`](docs/INCREMENT_16_0.md)
- [`docs/ROADMAP_0_7.md`](docs/ROADMAP_0_7.md)
- [`docs/DOCUMENTATION_INDEX.md`](docs/DOCUMENTATION_INDEX.md)
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
- [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md)
- [`docs/adr/README.md`](docs/adr/README.md)

Histórico da v0.6:

- [`docs/ROADMAP_0_6.md`](docs/ROADMAP_0_6.md)
- [`docs/RELEASE_0_6.md`](docs/RELEASE_0_6.md)
- `docs/INCREMENT_14_*`
- `docs/POLISH_14_11*`

## Estado das linhas

- `v0.3.x` — histórica;
- `v0.4.x` — histórica;
- `v0.5.0` — histórica;
- `v0.6.0` — baseline técnica encerrada e congelada;
- `v0.7.0` — Educational Integrations; publicada e encerrada;
- `v0.8` — Professor Experience & Journey MVP; linha ativa, `16.0` em execução.

## Licença

MIT.
