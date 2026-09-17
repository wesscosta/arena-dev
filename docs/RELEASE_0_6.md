# Arena Dev Community v0.6.0 — Registro de fechamento

## Estado

A implementação funcional e o fechamento técnico da linha `14.x` estão concluídos e integrados à `main`.

**Baseline técnica oficial:** `v0.6.0 — Submissions, Assessment & Feedback`.

**HEAD documental de fechamento:** `789e6fb5599641192fa87933c45d4317dc53490d`.

Este arquivo diferencia **fechamento técnico da baseline** de **evidência de publicação externa**. Não marcar tag, GitHub Release, backup/restore ou CI final como concluídos sem evidência verificável.

## Entregas principais

- `ActivitySubmission` como entrega interna autoritativa;
- `SubmissionItem` polimórfico e autosave;
- fluxo visual do aluno;
- dashboard de entregas;
- correção individual;
- rubricas e avaliação estruturada;
- IA supervisionada;
- feedback individual com publicação explícita;
- triagem/correção em lote;
- evidências de processo;
- preparação provider-independent para Teams/Classroom;
- polish final da sessão, Timer, Home da turma e cards.

## Invariantes

- `ScoreEvent` continua fonte de verdade de XP;
- nota e XP permanecem independentes;
- IA não publica automaticamente;
- aluno só recebe `publishedFeedback`;
- evidências não são detector de IA/plágio;
- provider externo não vira dependência estrutural.

## Schema

Flyway **V1–V25**.

## Fechamento de código

- [x] linha 14.0–14.11 concluída;
- [x] polish final integrado;
- [x] PR principal da v0.6 mergeada;
- [x] ajustes finais pós-merge incorporados;
- [x] `main` contém o fechamento documental no SHA de referência informado acima.

## Evidências de publicação

Os itens abaixo permanecem explicitamente dependentes de verificação:

- [ ] CI final confirmado no mesmo SHA;
- [ ] backup real PostgreSQL 17 identificado;
- [ ] checksum `.sha256` validado;
- [ ] restore-check Flyway V1–V25 registrado;
- [ ] `release-gate.sh final` registrado;
- [ ] tag anotada `v0.6.0` confirmada;
- [ ] GitHub Release `Arena Dev Community v0.6.0` confirmada.

## Regra

O fechamento funcional/técnico da v0.6 não autoriza fabricar evidência operacional retroativa. Se os gates externos forem executados ou recuperados posteriormente, registrar aqui URL, SHA, arquivo de backup e resultado correspondente.

## Evidência de fechamento visual

O polish final inclui:

- remoção de descrições redundantes na Arena;
- tipografia normalizada;
- badge `AO VIVO` ao lado do título;
- retorno à Home ao encerrar sessão;
- Timer com distribuição espacial refinada;
- presets do Timer em linha única no desktop;
- cards de turma com dimensões/footer uniformes;
- badge de sessão ativa no footer;
- CTAs `Iniciar Arena` e `Continuar Arena` em largura total e linguagem visual coerente.

## Continuidade

A evolução funcional passa para `v0.7 — Educational Integrations`. Consulte [`ROADMAP_0_7.md`](ROADMAP_0_7.md).
