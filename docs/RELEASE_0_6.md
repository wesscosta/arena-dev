# Arena Dev Community v0.6.0 — Release Checklist

## Entregas principais
- ActivitySubmission como fonte de verdade das entregas;
- SubmissionItem polimórfico e autosave;
- fluxo visual do aluno;
- dashboard e correção individual;
- rubricas e avaliação estruturada;
- IA supervisionada;
- feedback individual publicado explicitamente;
- triagem em lote;
- evidências de processo;
- fronteira provider-independent para Teams/Classroom.

## Invariantes
- ScoreEvent continua fonte de verdade de XP;
- nota e XP são independentes;
- IA não publica automaticamente;
- aluno só recebe publishedFeedback;
- evidências não são detector de IA/plágio;
- provider externo não vira dependência estrutural.

## Pré-merge
- [ ] `git diff --check`
- [ ] `scripts/release/release-gate.sh local`
- [ ] branch sincronizada
- [ ] PR para `main`
- [ ] CI verde

## Pós-merge
- [ ] `main` limpa e atualizada
- [ ] backup real + `.sha256`
- [ ] CI da `main` verde no mesmo SHA
- [ ] `release-gate.sh final` verde
- [ ] tag `v0.6.0`
- [ ] GitHub Release `Arena Dev Community v0.6.0`
