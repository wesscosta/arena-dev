# Estado atual — Arena Dev

**Última sincronização documental:** 17 de setembro de 2026

**Baseline técnica corrente:** `v0.6.0 — Submissions, Assessment & Feedback`.

**Estado da linha:** encerrada e congelada para evolução funcional.

**HEAD documental de fechamento:** `789e6fb5599641192fa87933c45d4317dc53490d`.

**Próxima linha:** `v0.7 — Educational Integrations`.

**Próximo incremento:** `15.0 — Integration Core Consolidation`.

## Estado resumido

A linha `14.x` está encerrada. O domínio de submissões, avaliação estruturada, IA supervisionada, feedback publicado, triagem, evidências de processo e preparação provider-independent para Teams/Classroom está integrado à `main`.

Foram incorporados o merge principal da v0.6 (PR #14) e os ajustes finais das PRs #15 e #16.

A documentação considera a v0.6 **baseline técnica oficial**. Tag/GitHub Release não devem ser afirmadas como publicadas sem evidência verificável no mesmo SHA.

## Baseline v0.6

```text
v0.6.0
main HEAD documental  789e6fb5599641192fa87933c45d4317dc53490d
schema                 Flyway V1–V25
linha                  14.x encerrada
```

## Domínio consolidado

```text
Activity
  ↓
ActivitySubmission
  ↓
SubmissionItem
  ↓
SubmissionAssessment
  ├── AssessmentCriterion
  ├── AI suggestion
  ├── teacher review
  └── publishedFeedback
```

Invariantes:

```text
ParticipantAnswer = resposta do Quiz ao vivo
ActivitySubmission= entrega interna da atividade
ScoreEvent         = fonte de verdade do XP
nota               ≠ XP
IA                 = sugestão, nunca autoridade
```

## Incrementos v0.6

```text
14.0  Bootstrap e arquitetura                         concluído
14.1  ActivitySubmission                              concluído
14.2  SubmissionItem, autosave e envio               concluído
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

## Schema

Maior migration da baseline: **V25**.

- V18 — `activity_submissions`;
- V19 — `submission_items`;
- V20 — `submission_assessments`;
- V21 — rubricas e critérios;
- V22 — sugestões de avaliação por IA;
- V23 — feedback de avaliação;
- V24 — evidências de processo;
- V25 — vínculos provider-independent de plataformas externas.

## UX consolidada

O fechamento da v0.6 inclui:

- sessão ao vivo com menos microcopy redundante;
- escala tipográfica normalizada;
- `AO VIVO` ao lado do título;
- encerramento retornando à Home da turma;
- Timer com melhor ocupação do espaço;
- cards de turma com altura/footer padronizados;
- badge de sessão em andamento;
- CTAs da Home em largura total e linguagem visual consistente.

## Continuidade — v0.7

A v0.7 não recria o Integration Core do zero. O primeiro passo é auditar o que já foi preparado no `14.10 / V25` e consolidar contratos provider-independent antes de OAuth ou APIs externas.

```text
15.0A Audit & Contract Freeze
15.0B Integration Domain
15.0C Persistence / V26
15.0D Application Services
15.0E Administrative API
15.0F Tests & Documentation
```

Após o 15.0, a sequência planejada é:

```text
15.1 Microsoft Identity + Graph Connection
15.2 Teams Classrooms & Students
15.3 Activity Mapping
15.4 Submission Import
15.5 Grade & Feedback Sync
15.6 Google Classroom Adapter
15.7 Integration Operations UI
15.8 Conflict Resolution & Observability
15.9 Hardening, E2E & Release Gate
```
