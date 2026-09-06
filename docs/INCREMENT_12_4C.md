# Incremento 12.4C — Runtime autoritativo do Roteiro ao Vivo

## Decisão arquitetural

O step atual não ganha uma nova tabela.

O projeto já possui:

```text
ClassSession
└── SessionDynamic(type = ARENA)
```

O estado `ARENA` já é a fonte persistente da atividade, questão atual e
progresso da condução. O 12.4C evolui esse mesmo estado com:

```text
currentStepId
currentStepPosition
```

Isso evita duplicação entre `class_sessions`, uma nova tabela de flow e
`session_dynamics`.

## Separação

```text
ActivityStep[]             = autoria / template
SessionDynamic.ARENA       = runtime da sessão
```

## API

```http
GET  /api/sessions/{sessionId}/mechanics/arena/flow
POST /api/sessions/{sessionId}/mechanics/arena/flow/start
POST /api/sessions/{sessionId}/mechanics/arena/flow/previous
POST /api/sessions/{sessionId}/mechanics/arena/flow/next
```

O backend é autoritativo para atividade ativa, step atual, posição e limites
de navegação.

## Sem avanço automático

Nenhuma condição avança o roteiro: Timer, respostas, Buzzer, presença ou
finalização de Nuvem. Somente comandos explícitos do professor alteram o step.

## Questões

Quando o step ativo é `QUESTION`, o backend sincroniza:

```text
ActivityStep.question
        ↓
SessionDynamic.ARENA.currentQuestionId
```

Assim o sistema atual de XP continua usando a questão atual.

## Compatibilidade

Atividades antigas sem `ActivityStep` continuam usando `Próxima questão` e
`Reiniciar questões`.

Atividades com roteiro usam `Iniciar roteiro`, `Anterior` e `Próximo`.

## UI

A aba Condução passa a exibir timeline, step atual e controles manuais.

Nuvem preparada pode ser aberta manualmente em `Interações` neste incremento.
A ativação automática de `WordCloudRound` pertence ao 12.4E.

`POLL` permanece preview; votos entram no 12.4D.

## Persistência

Não há migration nova no 12.4C. O schema continua em V10.

## Gate

```bash
cd backend
mvn -B -ntp verify

cd ../frontend
npm test
npm run typecheck
npm run build

cd ..
docker compose up -d --build
docker compose ps
```

## Validação manual

1. criar atividade com pelo menos 3 steps;
2. iniciar Arena usando essa atividade;
3. confirmar `Roteiro pronto para iniciar`;
4. iniciar roteiro;
5. avançar Slide → Questão → Nuvem;
6. confirmar questão atual disponível para XP;
7. voltar com Anterior;
8. recarregar a página;
9. confirmar o mesmo step;
10. confirmar que o último step não avança sozinho.
