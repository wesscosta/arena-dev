# Arena Dev Community v0.6.0 — Release Checklist

## Estado

Implementação funcional concluída até o incremento 14.11, com polish final de UI em fechamento.

**A release ainda não foi publicada.**

## Entregas principais

- `ActivitySubmission` como fonte de verdade das entregas;
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

## Pré-merge

- [ ] commit final de UI + documentação;
- [ ] `git diff --check`;
- [ ] backend `mvn -B -ntp verify`;
- [ ] frontend `npm test`;
- [ ] frontend `npm run typecheck`;
- [ ] frontend `npm run build`;
- [ ] `scripts/release/release-gate.sh local`;
- [ ] branch limpa e sincronizada;
- [ ] PR para `main`;
- [ ] CI do PR verde.

## Pós-merge

- [ ] `main` limpa e atualizada;
- [ ] CI verde no mesmo SHA;
- [ ] backup real PostgreSQL 17;
- [ ] checksum `.sha256`;
- [ ] restore-check Flyway V1–V25;
- [ ] `scripts/release/release-gate.sh final --ci-run-url ... --backup ...`;
- [ ] tag anotada `v0.6.0`;
- [ ] GitHub Release `Arena Dev Community v0.6.0`.

## Regra

Não criar/mover a tag antes do gate final.

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
