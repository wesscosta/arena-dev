# Arena Dev v0.7.0 — Educational Integrations

## Estado

**Linha técnica concluída.**

A linha 15.x encerra a integração educacional operacional com foco em Microsoft
Teams, mantendo o Arena Dev como autoridade sobre avaliação, decisão docente,
feedback supervisionado e XP.

A publicação de tag/GitHub Release só deve ser registrada depois de CI e gate
final verdes no mesmo SHA.

## Escopo entregue

```text
15.0  Integration Core Consolidation                  concluído
15.1  Microsoft Identity + Graph Connection           concluído
15.2  Teams Classrooms & Students                     concluído
15.3  Activity Mapping                                concluído
15.4  Submission Import                               concluído
15.5  Grade & Feedback Sync                           concluído
15.6  Google Classroom                                standby / não bloqueante
15.7  Integration Operations UI                       concluído
15.8  Conflict Resolution & Observability             concluído
15.8A Health & Conflict Summary                       concluído
15.8A.1 Observability Hardening                       concluído
15.8B Automatic Sync Telemetry                        concluído
15.8C Failure Drill-down & Operational Refresh        concluído
15.9  Hardening, E2E & Release Gate                   concluído
```

## Microsoft Teams

A v0.7 cobre conexão OAuth/Entra, descoberta e vínculo de turmas, roster,
matching supervisionado, reconciliação, mapeamento de atividades, rastreamento e
importação de entregas, nota/feedback supervisionados, publicação explícita,
telemetria e observabilidade.

## Google Classroom

Google permanece deliberadamente em **standby**. A infraestrutura existente é
preservada, mas paridade operacional com Microsoft não bloqueia a v0.7.0.

## Persistência

Schema da release: **Flyway V1–V27**.

## Gate técnico

```bash
scripts/release/release-gate.sh local
```

O modo `final` continua exigindo `main` limpa, sincronizada, CI verde no mesmo
SHA e backup restaurável.

## Evidência externa

Não registrar tag ou GitHub Release sem verificar a publicação no mesmo SHA.
