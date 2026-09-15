# Estado atual — Arena Dev

**Última sincronização documental:** 15 de setembro de 2026

**Release estável:** `v0.5.0 — Live Quiz & Structured Responses`.

**Linha em fechamento:** `v0.6.0 — Submissions, Assessment & Feedback`.

**Branch:** `feat/v0.6-submissions-assessment`.

**Checkpoint:** `14.11 — Hardening, E2E, release gate e polish final de UI`.

## Estado resumido

A implementação funcional da v0.6 está concluída até o 14.11. A branch contém o domínio de submissões, avaliação estruturada, IA supervisionada, feedback publicado, triagem, evidências de processo e preparação provider-independent para Teams/Classroom.

A release **ainda não está publicada**. Antes da tag `v0.6.0` faltam:

```text
commit final do polish/documentação
gate local completo
PR + merge em main
CI verde no SHA final
backup real + SHA-256
restore-check PostgreSQL 17 / Flyway V1–V25
release-gate.sh final
tag anotada v0.6.0
GitHub Release
```

## Baseline estável

```text
v0.5.0
merge main      55c76e96cb3726fbe7fee0bd09f26ad8ce43ccfe
schema          Flyway V1–V17
```

A tag `v0.5.0` está congelada.

## Domínio v0.6

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
ActivitySubmission= entrega geral de atividade
ScoreEvent         = fonte de verdade do XP
nota               ≠ XP
IA                 = sugestão, nunca autoridade
```

## Incrementos

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
14.11 Hardening, E2E e release gate                   fechamento
```

## Schema

Maior migration: **V25**.

- V18 — `activity_submissions`;
- V19 — `submission_items`;
- V20 — `submission_assessments`;
- V21 — rubricas e critérios;
- V22 — sugestões de avaliação por IA;
- V23 — feedback de avaliação;
- V24 — evidências de processo;
- V25 — vínculos provider-independent de plataformas externas.

## UX de fechamento

Polish consolidado no 14.11:

- sessão ao vivo com menos microcopy redundante;
- escala tipográfica normalizada;
- `AO VIVO` ao lado do título;
- encerramento retorna à Home da turma;
- Timer com melhor ocupação do espaço e presets em linha;
- cards de turma com altura/footer padronizados;
- badge `SESSÃO EM ANDAMENTO` no footer;
- CTAs da Home da turma em largura total e linguagem verde consistente.

## Release

Metadata de release: `0.6.0`.

O gate local deve ser repetido após o commit final de UI/documentação.

Com a branch limpa e sincronizada:

```bash
scripts/release/release-gate.sh local
```

Após merge em `main`, CI verde no mesmo SHA e backup real:

```bash
scripts/release/release-gate.sh final \
  --ci-run-url <URL_DO_RUN> \
  --backup <ARQUIVO.dump>
```

Somente depois: tag `v0.6.0` e GitHub Release.
