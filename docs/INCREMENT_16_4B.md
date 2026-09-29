# Incremento 16.4B — Live dentro do Student Shell

**Status:** implementado tecnicamente em 28/09/2026; validação visual manual pendente.

## Decisão de produto

`/join` continua sendo a porta pública por QR/código. `/learn/live` é o hub persistente do aluno e reutiliza o mesmo `StudentJoinFlow`; não existe um segundo runtime live.

A Home responde “o que faço agora?”, Jornadas responde “o que tenho para estudar?” e Ao vivo responde “o que está acontecendo agora?”. Sessões ativas podem aparecer na Home sem transformar a Home em catálogo ou runner.

## Discovery

`GET /api/learn/live` resolve o `Student` pelo device claim e consulta todas as matrículas ativas desse aluno. Retorna somente sessões ACTIVE com join code utilizável, inclusive de outras turmas do mesmo aluno.

A descoberta não consulta `studentStudyAccessEnabled`. Uma turma pode ocultar o workspace de Jornadas e continuar disponível ao vivo. Listar uma sessão também não concede participação: a entrada continua validada pelo `SessionJoinService`.

## UX

- `/learn/live` prioriza sessões conhecidas e mantém código manual como alternativa;
- múltiplas sessões são apresentadas para escolha explícita;
- `StudentJoinFlow` aceita `initialCode`, sem autojoin silencioso;
- a variante embedded remove a marca duplicada do card;
- o formulário embedded usa uma superfície maior e centralizada;
- a Home mostra CTA “Agora” somente quando existe sessão descoberta;
- o título da Home não promete continuidade quando não há Jornada.

## Gates

Cobertura adicionada para discovery multi-turma e sessão encerrada, além de testes estruturais do Student Shell. `/join` permanece usando o mesmo `StudentJoinFlow` em modo público.

## Fechamento do ciclo

Integrado ao checkpoint do Student Experience em 28/09/2026. Live continua independente da flag de estudo persistente e reutiliza o runtime de entrada existente. Ver [`CLOSURE_16_4_STUDENT_EXPERIENCE.md`](CLOSURE_16_4_STUDENT_EXPERIENCE.md).
