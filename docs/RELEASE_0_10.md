# Arena Dev v0.10.0 — Notas de release preparatórias

**Status: candidata 0.10.0-rc.1, NÃO PUBLICADA.** A interface e os documentos passaram por consolidação local em 09/10; o CI citado nesta página é **histórico** e não cobre ainda o diff local. Veja [auditoria e bloqueadores](v0.10/AUDITORIA_CONSOLIDACAO_2026-10-09.md). Este documento descreve a implementação validada automaticamente, mas não autoriza tag estável ou implantação. A baseline publicada permanece v0.9.0. A release estável depende dos gates em [checklist GO/NO-GO](v0.10/RELEASE_CANDIDATE_CHECKLIST.md) e [aceite operacional](v0.10/OPERATIONAL_ACCEPTANCE.md).

## Principais entregas da candidata

- Learning Loop: diagnóstico, intervenção docente e verificação, com comparação apenas das respostas pareáveis, sem inferir mastery longitudinal.
- XP manual/Buzzer com chave de idempotência V56, concorrência serializada e replay do mesmo evento; limitações de refresh e clientes antigos no [ADR-0066](adr/ADR-0066-manual-score-creation-idempotency.md).
- Sorteio confiável Grid/Roleta: tentativas e histórico persistidos, pontuação XP idempotente, reversão auditável e reconciliação por GET em estado de rede incerto.
- Peer Instruction e Clínica do Erro: segunda verificação após discussão, anotações docentes sobre distratores e evidência separada de score.
- Biblioteca contextual: referência canônica de material na Arena com modal responsivo, sem duplicar conteúdo nem embutir Canva em iframe.
- Autoconfiança opt-in e sugestões de recuperação: resultado agregado protegido contra amostras pequenas e intervenção sob decisão docente.
- Dashboard em lote para reduzir fan-out da Home, PWA offline segura, reconexão do aluno e backoff WebSocket docente.
- Painel de evidências da sessão, acessível apenas ao docente, com comparação de ciclos e lacunas de pareamento.

## Compatibilidade e implantação

- Migrações PostgreSQL Flyway V49–V56, preservando o histórico v0.9/V48. O retorno à v0.9 requer **restore do backup V48 pré-upgrade**, não downgrade de schema in-place; escritas após backup podem ser perdidas.
- Implantação suportada nesta candidata: **um operador docente por instância self-hosted**. Não oferece isolamento multi-docente/SaaS.
- Faça backup, verifique checksum e execute restore de homologação antes de qualquer cutover. Preserve rollback operacional, janela e RTO/RPO definidos.
- Clientes PWA v0.9 já instalados precisam de homologação em Android/iOS físicos antes do GO.

## Evidências e limites

- CI no SHA `38b73ca829e7f57b24fc97ec2a29dc73ba5ec0f1`: [GitHub Actions #37873486460](https://github.com/wesscosta/arena-dev/actions/runs/37873486460), três jobs aprovados.
- Testes locais e regressões estão registrados em [EXECUTION_STATUS](v0.10/EXECUTION_STATUS.md); não são equivalentes a experiência real em sala, auditoria manual WCAG, conectividade física nem rollback operacional.
- Correção do E2E de WebSocket: distinguir GET `/join-code` de GET de imagem `/join-code/qr`, sem alterar comportamento da API.

## Bloqueadores para publicação

1. Android/Chrome e iOS/Safari atualizando PWA v0.9 instalada.
2. Rede instável real, dispositivos simultâneos e integridade/idempotência.
3. Revisão manual de teclado, foco, leitores de tela e zoom 200–400%.
4. Piloto pedagógico documentado com turma real.
5. Homologação de rollback RTO/RPO, revisão de segurança e decisão GO assinada.

**Publicação:** somente após todos os itens aplicáveis passarem, PR aprovado/merge, mudança de metadata para `0.10.0`, CI verde no SHA de `main`, `release-gate.sh final` aprovado, tag e GitHub Release. Não declarar esta candidata estável antecipadamente.
