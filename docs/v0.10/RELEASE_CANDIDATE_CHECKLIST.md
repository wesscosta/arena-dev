# Gate de release v0.10 — Checklist GO / NO-GO

**Candidata em homologação:** `0.10.0-rc.1`, branch `feat/v0.10-learning-loop`, PR #35 em rascunho. **Não executar merge, tag nem deploy** antes de aprovar todos os gates abaixo. Evidências devem apontar para o **mesmo SHA** do candidato.

## 1. Gates automatizáveis

- [x] Código da candidata identificado de modo diferente da v0.9 publicada (Java + npm + lockfile em `0.10.0-rc.1`).
- [x] Contratos históricos v0.6→v0.9 + novo verificador v0.10/V49–V55, licença e scripts com sintaxe validada.
- [x] Dump consistente + checksum do banco **de desenvolvimento**; restore PostgreSQL 17 isolado V55; rejeição de dump com versão esperada V48. Não equivale ao backup de produção.
- [x] Bloqueio de `release-gate.sh final` enquanto metadata ainda é `0.10.0-rc.1`.
- [x] CI GitHub **três jobs** backend/frontend/Compose+Chromium **aprovados** no SHA de implementação `7cf22a9684d09bc22bc693014b0fb5319cbb2654`: [run #37864958170](https://github.com/wesscosta/arena-dev/actions/runs/37864958170), `status=completed`, `conclusion=success`. Após novo commit só de documentação, o SHA de publicação final deverá ter CI aprovado novamente.
- [x] `release-gate.sh local` **exit 0**, no SHA funcional `7cf22a9`: Maven verify **195 Surefire + 122 Failsafe**, frontend **312/312**, auditoria de dependências (`0 vulnerabilities`), lint, typecheck e build, imagens Docker backend/frontend, execução não-root, health liveness/readiness, PostgreSQL isolado e **35/35 E2E Chromium**. Evidência local ignorada pelo Git: `release-evidence/v0.10.0-rc.1-local-20261009T003721Z.log`. A primeira build Docker fria precisou reconstituir cache Maven, mas o **retry** terminou com imagem válida (build exit 0) e gate integral concluído.
- [x] **Sorteio: falha HTTP ambígua / offline simulado** em Chromium. Após commit de seleção ou pontuação com resposta perdida, UI exige GET de sincronização sem refazer POST; ledger permanece com 1 attempt/1 ScoreEvent. Sem rede antes de clicar, não há POST. [ADR-0064](../adr/ADR-0064-network-uncertainty-draw-reconciliation-and-pwa-cache.md). Testes focados 3/3 aprovados.
- [x] **Reconexão docente WebSocket simulada:** desligar navegador por 3,4 s, nenhuma nova consulta enquanto offline, GET de snapshots no retorno, sem POST nem alteração do sorteio; queda com navegador online usa backoff progressivo 1/2/4/8/10s ([ADR-0065](../adr/ADR-0065-teacher-websocket-backoff-and-offline-recovery.md)).
- [ ] **Rede degradada em condições reais:** latência/perda, PWA instalada, múltiplos navegadores simultâneos, reprise/idempotência do Learning Check e validação de XP com desconexão no meio da confirmação. Ainda não equivale à simulação Chromium.
- [x] Regressão **local** do Chromium **39/39 no mesmo código** após WS docente; 3/3 testes focados e Docker frontend reconstruído. `format:check`, lint 0 erros, TypeScript, **313/313 testes frontend** e build aprovados. **CI remoto do commit novo continua sendo gate distinto**: a execução verde anterior pertence a `188949a`; confirmar HEAD deste incremento após push, não reutilizar a aprovação antiga.
- [ ] Auditoria de dependências e segurança sem risco bloqueador, autorização de professor/estudante/projetor e ameaças a sessão/identidade revisadas.
- [ ] Gate final **na main** no SHA de CI verde, versão estável `0.10.0`, backup restaurável/checksum V55; tag/release apenas depois do gate e autorização consciente.

## 2. Gates operacionais/manuais

- [ ] Upgrade de PWA **previamente instalada em v0.9** para v0.10 em Android/Chrome e iOS/Safari, com atividade em andamento e cache/service worker antigo; perda de rede, retomada, gabarito e tokens.
- [ ] Navegação por teclado, ordem/foco, NVDA/VoiceOver, zoom 200–400%, contraste claro/escuro, tamanhos mobile/tablet/desktop e modo projetor. Testes axe-core **não certificam WCAG AAA**.
- [ ] Roteiro docente piloto em turma real: Sorteio, Peer Instruction, Clínica do Erro, Material contextual, Verificar aprendizagem, Antes/Depois e Painel de evidências. Registrar feedback e métrica operacional; **não medir mastery com apenas uma verificação**.
- [x] **Ensaio técnico isolado** v0.9.0 real / V48 → dump sintético + SHA-256 → backend v0.10 / V55 → restore V48 → reinício v0.9 original, com integridade de IDs, presença, reversão e saldo XP confirmados em **duas execuções exit 0** (`scripts/release/rehearse-v09-v010-rollback.sh`; [ADR-0063](../adr/ADR-0063-v09-to-v010-isolated-rollback-rehearsal.md)). Sem tocar a instalação principal.
- [ ] **Homologação de rollback operacional:** volume representativo, janela de manutenção, cronômetro RTO/RPO, snapshot pré-upgrade validado, dados gravados durante janela, cliente PWA antigo e rede/reconexão; o teste sintético não comprova recuperação real de produção.
- [ ] Decisão operacional documentada: v0.10 é edição **self-hosted de operador docente único**, conforme ADR-0053, até que propriedade/autorização multi-docente seja implementada; não apresentar como SaaS multi-tenant.
- [ ] README, docs, Notion, release notes, decisão GO/NO-GO, PR aprovado, plano de suporte e monitoração de erros atualizados.

**Observação:** experimentos de embed Canva, Meta Coletiva, algoritmo avançado de IA e Mastery longitudinal **não** bloqueiam esta release; devem ser tratados em roadmap/pilotos próprios.
