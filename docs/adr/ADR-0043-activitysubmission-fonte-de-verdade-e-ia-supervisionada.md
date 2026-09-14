# ADR-0043 — ActivitySubmission como fonte de verdade e IA supervisionada

**Status:** Aceito

**Data:** 13/09/2026

## Contexto

A v0.5 consolidou Quiz ao vivo e `ParticipantAnswer`, mas o Arena ainda não possui uma abstração persistente para uma entrega completa de atividade fora do runtime do Quiz.

O problema prioritário da v0.6 é acompanhar quem entregou, corrigir cada entrega e devolver feedback individual com apoio de IA.

Também existe a necessidade futura de integração com Microsoft Teams e Google Classroom.

## Decisão

### 1. ActivitySubmission é a fonte de verdade da entrega

Uma entrega de atividade será representada por `ActivitySubmission`, vinculada à `Activity` e à matrícula (`Enrollment`).

As respostas da entrega serão representadas por `SubmissionAnswer`.

Não reutilizar `ParticipantAnswer`, pois ele pertence ao `QuizRound` e ao runtime ao vivo.

### 2. Assessment representa avaliação, não XP

A avaliação da entrega será representada por `Assessment`.

`ScoreEvent` continua sendo a única fonte de verdade do XP.

Uma avaliação poderá opcionalmente originar um `ScoreEvent` idempotente em incremento posterior.

### 3. IA é assistiva e supervisionada

Saídas de IA são sugestões.

Nenhuma nota, feedback ou devolutiva de IA é publicada automaticamente.

O sistema deve distinguir pelo menos:

```text
sugestão da IA
revisão/edição do professor
conteúdo aprovado
conteúdo publicado
```

Somente conteúdo publicado é visível ao aluno.

### 4. Integrações externas são adapters

Microsoft Teams e Google Classroom não definem o modelo interno de submissão.

A arquitetura futura poderá mapear identidades externas e sincronizar atividades/notas, mas `ActivitySubmission` permanece provider-agnostic.

A origem pode ser modelada conceitualmente como:

```text
ARENA
TEAMS
GOOGLE_CLASSROOM
IMPORT
```

Na primeira implementação, apenas `ARENA` precisa operar.

### 5. NOT_STARTED deve ser preferencialmente derivado

Antes de criar uma `ActivitySubmission`, o aluno pode aparecer como “não iniciado” pela combinação de roster + ausência de submissão.

Persistir uma linha apenas para representar `NOT_STARTED` deve ser evitado salvo necessidade demonstrada no 14.1.

## Consequências

### Positivas

- separa runtime de Quiz de entrega assíncrona;
- permite dashboard confiável por atividade;
- facilita correção individual;
- habilita IA com teacher-in-the-loop;
- prepara Teams/Classroom sem acoplar o domínio;
- preserva `ScoreEvent` como ledger exclusivo de XP.

### Custos

- novo domínio persistente;
- novas migrations e APIs a partir do 14.1;
- necessidade de políticas explícitas de tentativa, reenvio e reabertura;
- necessidade futura de governança de dados enviados a provedores de IA.

## Não decidido neste ADR

- schema SQL final;
- política de múltiplas tentativas;
- prazo/due date;
- anexos;
- execução de código;
- provedor de IA;
- modelo de `ExternalIdentity`;
- sincronização real com Teams/Classroom.

Esses pontos serão fechados em incrementos posteriores.
