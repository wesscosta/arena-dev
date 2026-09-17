# Arena Dev Community

**Arena Dev Community** é uma plataforma open source e self-hosted para condução, participação e gamificação de dinâmicas de sala, com foco em baixa fricção para o professor.

> **Baseline técnica corrente:** `v0.6.0 — Submissions, Assessment & Feedback`.
>
> **Estado:** linha `14.x` encerrada e congelada em `main`.
>
> **HEAD documental de fechamento:** `789e6fb5599641192fa87933c45d4317dc53490d`.
>
> **Próxima linha:** `v0.7 — Educational Integrations`, iniciando pelo `15.0 — Integration Core Consolidation`.

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

## Integrações externas — próxima linha

A v0.6 encerrou a preparação provider-independent. A v0.7 transforma essa fundação em uma camada operacional de integrações:

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

O primeiro incremento da v0.7 é `15.0 — Integration Core Consolidation`, ainda **sem Microsoft Graph ou Google API**.

## Arquitetura

```mermaid
flowchart LR
    T["Professor"] --> F["Next.js 16 + React 19"]
    S["Aluno /join"] --> F
    P["Projetor"] --> F
    F -->|"REST"| B["Java 21 + Spring Boot 4.1"]
    F <-->|"WebSocket"| B
    B --> D["PostgreSQL 17 + Flyway V1–V25"]
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

## v0.7 — continuidade

```text
15.0  Integration Core Consolidation
15.1  Microsoft Identity + Graph Connection
15.2  Teams Classrooms & Students
15.3  Activity Mapping
15.4  Submission Import
15.5  Grade & Feedback Sync
15.6  Google Classroom Adapter
15.7  Integration Operations UI
15.8  Conflict Resolution & Observability
15.9  Hardening, E2E & Release Gate
```

A execução começa pelo `15.0A — Audit & Contract Freeze`: auditar o que já existe em `14.10 / V25` e classificar contratos como `KEEP`, `EXTEND`, `RENAME`, `DEPRECATE` ou `REMOVE`.

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
- `v0.7` — próxima linha de desenvolvimento.

## Licença

MIT.
