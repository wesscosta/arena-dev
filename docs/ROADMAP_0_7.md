# Roadmap — Arena Dev v0.7

## Linha

**v0.7 — Educational Integrations**

## Objetivo

Conectar o Arena Dev a plataformas educacionais externas sem transformar Microsoft Teams ou Google Classroom em dependências do domínio central e sem duplicar o fluxo de submissão, avaliação e feedback construído na v0.6.

## Princípio arquitetural

```text
Teams / Classroom
        ↓
Provider Adapter
        ↓
Integration Core
        ↓
Arena Dev Domain
```

Nunca acoplar IDs, tokens ou contratos externos diretamente a `ActivitySubmission`, `Assessment`, `ScoreEvent` ou demais agregados centrais.

## Autoridade dos dados

A plataforma externa pode ser sistema de origem de turma, estudante, atividade ou submissão.

O Arena Dev permanece autoridade sobre:

- vínculos internos;
- processo de avaliação;
- decisão docente;
- feedback supervisionado;
- XP / `ScoreEvent`;
- histórico de sincronização.

## Sequência

```text
15.0  Integration Core Consolidation                  concluído
15.1  Microsoft Identity + Graph Connection             concluído
15.2  Teams Classrooms & Students                       concluído
15.3  Activity Mapping                                  concluído
15.4  Submission Import                                 concluído
15.5  Grade & Feedback Sync                             concluído
15.6  Google Classroom Adapter                          standby
15.7  Integration Operations UI                         concluído
15.8  Conflict Resolution & Observability               concluído
15.9  Hardening, E2E & Release Gate                     concluído
```

## 15.0 — Integration Core Consolidation

O 15.0 não recria a preparação do 14.10. Ele audita e consolida o que já existe no schema V25.

### 15.0A — Audit & Contract Freeze

Classificar estruturas existentes como:

```text
KEEP
EXTEND
RENAME
DEPRECATE
REMOVE
```

Auditar especialmente:

- `LearningPlatformGateway`;
- enums/provider identifiers;
- vínculos externos existentes;
- `SubmissionSource`;
- contratos de atividade/submissão externa;
- migrations e constraints de V25.

### 15.0B — Integration Domain

Modelo alvo:

```text
LearningPlatformProvider

IntegrationConnection

ExternalClassroomLink
ExternalStudentLink
ExternalActivityLink
ExternalSubmissionLink

SyncExecution
SyncItem
SyncCheckpoint
```

### 15.0C — Persistence

Somente após o audit definir o delta real.

Migration esperada: **V26**, caso mudanças persistentes sejam necessárias.

Não duplicar tabelas já existentes em V25.

### 15.0D — Application Services

Criar serviços provider-independent para:

- registrar e consultar conexões;
- vincular entidades internas/externas;
- iniciar e registrar execuções de sincronização;
- registrar resultado por item;
- controlar checkpoints.

### 15.0E — Administrative API

Endpoints administrativos básicos sem OAuth real e sem chamadas externas.

### 15.0F — Tests & Documentation

Gate mínimo:

- domínio provider-independent;
- migrations verificadas;
- repositories/services;
- API administrativa;
- nenhuma dependência de Microsoft Graph;
- nenhuma dependência de Google API;
- nenhum segredo armazenado em claro;
- testes backend;
- contratos frontend/API preparados;
- documentação sincronizada.

## Estados de sincronização

Preferência:

```text
PENDING
RUNNING
PARTIALLY_SYNCED
SYNCED
FAILED
CANCELLED
```

`PARTIALLY_SYNCED` é necessário para diferenciar falha total de sincronização com itens parcialmente concluídos.

## Credenciais

O domínio deve depender de uma abstração de armazenamento:

```text
IntegrationCredentialStore
```

OAuth real entra no 15.1.

Tokens não devem ser armazenados em claro nem expostos no domínio.

## Regra de feedback

Somente conteúdo efetivamente publicado pelo professor pode ser elegível para sincronização externa.

```text
AI_SUGGESTED    não sincroniza
TEACHER_REVIEW  não sincroniza
APPROVED        não sincroniza
PUBLISHED       pode sincronizar
```

## Gate da v0.7

A linha fecha tecnicamente após:

- Microsoft coberto por testes de contrato;
- E2E dos fluxos críticos;
- resolução de conflitos;
- observabilidade e telemetria;
- migrations V1–V27 e restore-check;
- CI;
- release gate.

Google Classroom permanece em standby e não é bloqueante para a v0.7.0. Evidência
de tag/GitHub Release é registrada somente após publicação verificável no mesmo SHA.
