# Gate de release v0.10 — Checklist GO / NO-GO

**Candidata em andamento:** `0.10.0-rc.1`, branch `feat/v0.10-learning-loop`, PR #35 em rascunho. **Não executar merge, tag nem deploy** antes de aprovar todos os gates abaixo. Evidências devem apontar para o **mesmo SHA** do candidato.

## 1. Gates automatizáveis

- [x] Código da candidata identificado de modo diferente da v0.9 publicada (Java + npm + lockfile em `0.10.0-rc.1`).
- [x] Contratos históricos v0.6→v0.9 + novo verificador v0.10/V49–V55, licença e scripts com sintaxe validada.
- [x] Dump consistente + checksum do banco **de desenvolvimento**; restore PostgreSQL 17 isolado V55; rejeição de dump com versão esperada V48. Não equivale ao backup de produção.
- [x] Bloqueio de `release-gate.sh final` enquanto metadata ainda é `0.10.0-rc.1`.
- [ ] CI GitHub **três jobs** backend/frontend/Compose+Chromium concluídos com sucesso **no mesmo HEAD**; anexar URL de run (não usar run de commit antigo).
- [ ] `release-gate.sh local` integral verde no HEAD (backend, frontend, Compose isolado, saúde e E2E), evidência local na pasta ignorada `release-evidence/`. Ensaios parciais passaram em backend/frontend; rebuild Docker frio expôs gargalo Maven e nova imagem deve ser revalidada.
- [ ] Teste de concorrência/reconexão/replay em presença real e rede degradada, inclusive tentativas de sorteio V50, XP reversível V53 e Learning Check.
- [ ] Auditoria de dependências e segurança sem risco bloqueador, autorização de professor/estudante/projetor e ameaças a sessão/identidade revisadas.
- [ ] Gate final **na main** no SHA de CI verde, versão estável `0.10.0`, backup restaurável/checksum V55; tag/release apenas depois do gate e autorização consciente.

## 2. Gates operacionais/manuais

- [ ] Upgrade de PWA **previamente instalada em v0.9** para v0.10 em Android/Chrome e iOS/Safari, com atividade em andamento e cache/service worker antigo; perda de rede, retomada, gabarito e tokens.
- [ ] Navegação por teclado, ordem/foco, NVDA/VoiceOver, zoom 200–400%, contraste claro/escuro, tamanhos mobile/tablet/desktop e modo projetor. Testes axe-core **não certificam WCAG AAA**.
- [ ] Roteiro docente piloto em turma real: Sorteio, Peer Instruction, Clínica do Erro, Material contextual, Verificar aprendizagem, Antes/Depois e Painel de evidências. Registrar feedback e métrica operacional; **não medir mastery com apenas uma verificação**.
- [ ] Ensaio **separado** de rollback: dump sanitizado V48, upgrade V55, restauração do dump anterior e partida do binário v0.9, tempo de recuperação e invariantes de XP/dados.
- [ ] Decisão operacional documentada: v0.10 é edição **self-hosted de operador docente único**, conforme ADR-0053, até que propriedade/autorização multi-docente seja implementada; não apresentar como SaaS multi-tenant.
- [ ] README, docs, Notion, release notes, decisão GO/NO-GO, PR aprovado, plano de suporte e monitoração de erros atualizados.

**Observação:** experimentos de embed Canva, Meta Coletiva, algoritmo avançado de IA e Mastery longitudinal **não** bloqueiam esta release; devem ser tratados em roadmap/pilotos próprios.
