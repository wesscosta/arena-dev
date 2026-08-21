# Incremento 11.1 + 11.2 — Security Boundary e Realtime Hardening

## Objetivo

Endurecer o MVP sem adicionar novas mecânicas. A área administrativa passa a exigir autenticação do professor e o canal realtime reduz riscos de tomada de identidade, vazamento de token e spam do Buzzer.

## 11.1 — Security Boundary

- Spring Security protege `/api/**` por sessão autenticada com `ROLE_TEACHER`;
- `/api/health`, `/api/auth/login`, `/api/join/**` e handshake `/ws/**` permanecem públicos conforme necessidade;
- credenciais do professor vêm de `APP_TEACHER_USERNAME` / `APP_TEACHER_PASSWORD`;
- frontend envia cookie de sessão com `credentials: include`;
- CORS permite credenciais somente para os padrões configurados;
- UI possui login e logout explícitos.

## 11.2 — Realtime Hardening

- token do aluno não trafega mais na URL do WebSocket;
- aluno autentica no primeiro frame `AUTH_PARTICIPANT`;
- novo join é bloqueado enquanto aquele participante estiver conectado;
- professor pode liberar o dispositivo de um participante;
- múltiplas conexões do mesmo participante não marcam `connected=false` até a última fechar;
- heartbeat `PING/PONG` mantém o canal ativo;
- limite lógico de mensagens por socket reduz spam;
- clique duplicado na mesma rodada retorna sem novo broadcast;
- broadcasts de estado do Buzzer ocorrem após commit da transação.

## Credenciais de desenvolvimento

Os defaults existem apenas para desenvolvimento local:

```text
APP_TEACHER_USERNAME=professor
APP_TEACHER_PASSWORD=arena-dev-change-me
```

Antes de qualquer deploy, altere a senha e restrinja `APP_ALLOWED_ORIGIN_PATTERNS`.
