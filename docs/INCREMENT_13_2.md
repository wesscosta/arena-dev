# Incremento 13.2 — Respostas estruturadas no `/join`

**Data:** 10/09/2026  
**Linha:** `v0.5.0 — Live Quiz & Structured Responses`  
**Estado:** implementação preparada; gates frontend/backend pendentes.

## Objetivo

Permitir que o participante responda a um `QuizRound` ativo diretamente pelo `/join`, preservando autenticação temporária, reconnect e separação entre comando durável e sincronização em tempo real.

## Decisão de transporte

A resposta é um comando durável e usa REST:

```text
POST /api/join/{code}/quiz/{roundId}/answer
```

Body:

```json
{
  "token": "<participant-token>",
  "answer": "a"
}
```

ou, em verdadeiro/falso:

```json
{
  "token": "<participant-token>",
  "answer": true
}
```

O token temporário é validado contra a sessão resolvida pelo código. Não vai em query string e não depende de sessão do professor ou CSRF.

WebSocket continua responsável por projeção e sincronização (`QUIZ_STATE`), não pela persistência primária da resposta.

## Live Stage

Ao abrir um Quiz, `QuizService` ativa:

```text
LiveStageType.QUIZ
audience = BOTH
sourceId = roundId
```

Preparar (`READY`) não expõe a questão no palco. A mudança ocorre ao entrar em `OPEN`.

## Snapshot/reconnect

`SessionRuntimeSnapshotService` passa a transportar:

```text
PublicRuntimeSnapshot
└── quiz

ParticipantRuntimeSnapshot
├── quiz
└── quizParticipant
```

Assim, reload/reconnect restaura tanto o estado público quanto a resposta privada do próprio participante sem reexecutar o comando de resposta.

## UX `/join`

O card de Quiz:

- aparece somente quando o `LiveStage` está em `QUIZ`;
- renderiza múltipla escolha e verdadeiro/falso;
- destaca apenas a própria opção selecionada;
- confirma resposta registrada;
- permite alterar enquanto `OPEN`;
- desabilita escolhas após `LOCKED`;
- preserva a própria resposta no reconnect;
- não renderiza `correctAnswer` no card desta etapa.

Resultado detalhado/correção visual fica para 13.3/13.5.

## Gates

- `QuizJoinIT`: transporte público autenticado por token e rejeição de token inválido;
- `quiz-api.test.ts`: contrato REST, boolean `false` e estado vazio;
- `quiz-join-ui.test.ts`: vínculo com `LiveStageType.QUIZ`, token temporário e ausência de correção direta;
- `npm test`;
- `npm run typecheck`;
- `npm run build`;
- `mvn -B -ntp verify`.

## Próximo incremento

**13.3 — Resultados + Projetor**.
