# Roadmap histórico — Arena Dev v0.6.0

## Estado

**v0.6.0 — Submissions, Assessment & Feedback**

**Linha encerrada em 17/09/2026.**

A linha `14.x` está congelada. Novas funcionalidades pertencem à v0.7.

## Objetivo alcançado

Permitir que o professor acompanhe uma atividade do início à devolutiva sem controles paralelos, preservando a autoridade docente e sem transformar a Arena Dev em LMS.

## Princípios consolidados

1. Arena Dev mantém a autoridade do domínio pedagógico interno.
2. `ScoreEvent` continua sendo a fonte de verdade do XP.
3. Nota e XP são domínios independentes.
4. IA gera sugestões; professor revisa e publica.
5. Rascunhos da IA nunca são expostos ao aluno.
6. Evidências de processo orientam revisão; não são detector binário de IA/plágio.
7. Teams/Classroom entram por adapters provider-independent.
8. `ParticipantAnswer` do Quiz não é reutilizado como entrega geral.

## Incrementos concluídos

- [x] **14.0 — Bootstrap e arquitetura**
- [x] **14.1 — ActivitySubmission**
- [x] **14.2 — SubmissionItem, autosave e envio**
- [x] **14.3 — Dashboard de entregas**
- [x] **14.4 — Correção individual**
- [x] **14.4A — Entregas visíveis e navegáveis**
- [x] **14.4B — Fluxo visual do aluno**
- [x] **14.5 — Rubricas e avaliação estruturada**
- [x] **14.6 — AI-assisted grading supervisionado**
- [x] **14.7 — Feedback individual e publicação explícita**
- [x] **14.8 — Correção em lote / triagem**
- [x] **14.9 — Evidências de processo e integridade**
- [x] **14.10 — Preparação Teams/Classroom**
- [x] **14.11 — Hardening, E2E e release gate**
- [x] **14.11A–C — polish visual final da sessão, Timer, Home e cards**

## Entregas consolidadas

### Submissões
- `ActivitySubmission` + tentativa;
- `SubmissionItem` genérico;
- autosave/restauração;
- envio;
- dashboard por aluno/status.

### Avaliação
- correção individual;
- rubricas;
- pontuação por critério;
- nota separada de XP;
- feedback em rascunho/publicado.

### IA
- abstração de provider;
- sugestões persistidas;
- aplicação supervisionada;
- nenhuma autopublicação.

### Triagem e integridade
- processamento em lote;
- eventos de processo;
- similaridade textual;
- recomendação `LOW/MEDIUM/HIGH`;
- revisão humana obrigatória.

### Integrações
- `SubmissionSource`;
- `LearningPlatformGateway`;
- vínculos externos provider-independent;
- somente conteúdo publicado é elegível para sincronização futura.

### UX final
- redução de descrições redundantes;
- tipografia mais consistente;
- navegação correta ao encerrar sessão;
- Timer reorganizado;
- cards e footers uniformes;
- CTAs Iniciar/Continuar Arena refinados.

## Schema final da linha

```text
V18 activity_submissions
V19 submission_items
V20 submission_assessments
V21 assessment_rubrics
V22 ai_assessment_suggestions
V23 assessment_feedback
V24 submission_process_evidence
V25 learning_platform_links
```

## Fechamento técnico

```text
main HEAD documental:
789e6fb5599641192fa87933c45d4317dc53490d
```

O merge principal da v0.6 e os ajustes finais posteriores estão incorporados à `main`.

Este documento registra o fechamento funcional/técnico da linha. Evidências específicas de tag, CI final, backup/restore e GitHub Release devem permanecer em `RELEASE_0_6.md` e só podem ser marcadas como concluídas quando verificadas.

## Continuidade

A próxima linha é [`ROADMAP_0_7.md`](ROADMAP_0_7.md).
