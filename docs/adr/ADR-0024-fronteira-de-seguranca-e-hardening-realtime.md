# ADR-0024 — Fronteira de segurança do professor e hardening realtime

- **Status:** Aceito
- **Data:** 2026-08-21

## Contexto

Após o Incremento 10, o backend já era autoritativo para sessões, XP e Buzzer, porém endpoints administrativos não possuíam autenticação e o token temporário do aluno era enviado na query string do WebSocket.

## Decisão

1. A área administrativa usa Spring Security com sessão HTTP e papel `TEACHER`.
2. `/api/join/**` continua público, enquanto operações de turma, sessão, XP, atividades e controle do Buzzer exigem professor autenticado.
3. O token do participante não é enviado na URL do WebSocket; a autenticação ocorre por mensagem inicial no canal.
4. Reivindicação concorrente do mesmo participante é bloqueada enquanto houver dispositivo conectado e pode ser liberada explicitamente pelo professor.
5. O Buzzer mantém autoridade no backend, reduz broadcast duplicado, aplica limite lógico de mensagens e publica estado somente após commit.

## Consequências

- o frontend do professor precisa enviar cookie de sessão em todas as APIs administrativas;
- ambientes LAN continuam suportados via padrões de origem configuráveis;
- credenciais default são exclusivas de desenvolvimento e devem ser substituídas antes de deploy;
- autenticação institucional/multiusuário permanece evolução posterior.
