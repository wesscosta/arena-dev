# Incremento — Check-in unificado da Arena

## Objetivo

Unificar o antigo acesso dos alunos e a aba de participantes em uma única operação
de **Check-in**.

## Fluxo

```text
Professor abre Check-in
        ↓
QR Code + código + URL
        ↓
Aluno entra na sessão
        ↓
Backend marca presença automaticamente
        ↓
Lista lateral atualiza a operação da turma
        ↓
Professor ainda pode marcar/desmarcar manualmente
```

## Interface

A antiga aba `Participantes` deixa de existir.

O botão `Acesso dos alunos` passa a ser `Check-in`.

Quando aberto, o workspace possui:

- acesso da sessão à esquerda;
- roster da turma à direita;
- roster retrátil;
- QR Code maior;
- código da sessão em maior destaque;
- URL mais legível;
- estado `check-in` e `conectado` por aluno;
- checkbox manual do professor;
- liberação de dispositivo preservada.

## Regra de domínio

`SessionJoinService.issueParticipantAccess(...)` passa a executar:

```java
participant.setPresent(true);
```

Assim, um login válido é considerado check-in.

A alteração manual continua disponível através de
`setParticipantPresence`, portanto o professor pode desfazer ou refazer o check-in.
