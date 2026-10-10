# Arena Dev v0.10.0 — Learning Loop

**Status: release estável publicada `v0.10.0` (10/10/2026).** Foco: ciclo de aprendizagem, sorteio e XP resilientes, Arena responsiva e Biblioteca contextual. Escopo: self-hosted com um único operador docente. Os testes de campo foram aprovados por declaração do operador; os registros detalhados não foram anexados. O gate técnico inclui CI do SHA estável, backup/restauração e verificação final na `main`. Veja [auditoria e bloqueadores](v0.10/AUDITORIA_CONSOLIDACAO_2026-10-09.md). Este documento descreve a implementação validada automaticamente, mas não autoriza tag estável ou implantação. A baseline publicada permanece v0.9.0. A release estável depende dos gates em [checklist GO/NO-GO](v0.10/RELEASE_CANDIDATE_CHECKLIST.md) e [aceite operacional](v0.10/OPERATIONAL_ACCEPTANCE.md).

**Aceite:** [registro formal do operador](v0.10/OPERATOR_ACCEPTANCE_2026-10-10.md), [ensaios de rollback V56](v0.10/ROLLBACK_V56_SYNTHETIC_2026-10-10.md), backup de dados V56 com SHA-256 e restore em PostgreSQL isolado. A tag v0.10.0 aponta para o SHA publicado; o CI e o log do gate final devem ser preservados nos artefatos de release.

## Principais entregas da candidata

- Learning Loop: diagnóstico, intervenção docente e verificação, com comparação apenas das respostas pareáveis, sem inferir mastery longitudinal.
- XP manual/Buzzer com chave de idempotência V56, concorrência serializada e replay do mesmo evento; limitações de refresh e clientes antigos no [ADR-0066](adr/ADR-0066-manual-score-creation-idempotency.md).
- Sorteio confiável Grid/Roleta: tentativas e histórico persistidos, pontuação XP idempotente, reversão auditável e reconciliação por GET em estado de rede incerto.
- Peer Instruction e Clínica do Erro: segunda verificação após discussão, anotações docentes sobre distratores e evidência separada de score.
- Biblioteca contextual: referência canônica de material na Arena com modal responsivo, sem duplicar conteúdo nem embutir Canva em iframe.
- Autoconfiança opt-in e sugestões de recuperação: resultado agregado protegido contra amostras pequenas e intervenção sob decisão docente.
- Dashboard em lote para reduzir fan-out da Home, PWA offline segura, reconexão do aluno e backoff WebSocket docente.
- Painel de evidências da sessão, acessível apenas ao docente, com comparação de ciclos e lacunas de pareamento.
- Nova navegação responsiva: menu único no mobile, sidebar no desktop, Projetar no cabeçalho mobile; Material e Evidências em grupos pedagógicos da navegação.
- Timer em drawer de rolagem independente (indicador visual da barra oculto apenas no Timer), prévia recolhível e modo tela cheia.
- Exportações Notion com blocos `<aside>` renderizados como destaques Markdown seguros no leitor canônico.

## Compatibilidade e implantação

- Migrações PostgreSQL Flyway V49–V56, preservando o histórico v0.9/V48. O retorno à v0.9 requer **restore do backup V48 pré-upgrade**, não downgrade de schema in-place; escritas após backup podem ser perdidas.
- Implantação suportada nesta candidata: **um operador docente por instância self-hosted**. Não oferece isolamento multi-docente/SaaS.
- Faça backup, verifique checksum e execute restore de homologação antes de qualquer cutover. Preserve rollback operacional, janela e RTO/RPO definidos.
- Clientes PWA v0.9 já instalados precisam de homologação em Android/iOS físicos antes do GO.

## Evidências e limites

- CI histórico no SHA `38b73ca829e7f57b24fc97ec2a29dc73ba5ec0f1`: [GitHub Actions #37873486460](https://github.com/wesscosta/arena-dev/actions/runs/37873486460), três jobs aprovados; **não valida o HEAD atual**. CI SHA `d876325`: [run #38019345190](https://github.com/wesscosta/arena-dev/actions/runs/38019345190), em andamento quando registrada esta revisão.
- Ensaio isolado de rollback V48→V56→V48 **aprovado em 10/10/2026** (`exit 0`) no SHA `f03f813`, com backup/checksum e preservação de IDs/XP. [Registro](v0.10/ROLLBACK_V56_SYNTHETIC_2026-10-10.md). Não comprova rollback operacional.
- Testes locais mais recentes: frontend 319/319 unitários, 2/2 testes direcionados de rolagem Timer em Chromium, typecheck e build aprovados, lint sem erros. O operador declarou Safari/iOS validado, mas não apresentou roteiro formal de instalação/atualização v0.9→v0.10. Outros gates estão abertos. [EXECUTION_STATUS](v0.10/EXECUTION_STATUS.md).
- Correção do E2E de WebSocket: distinguir GET `/join-code` de GET de imagem `/join-code/qr`, sem alterar comportamento da API.

## Bloqueadores para publicação

1. Android/Chrome e iOS/Safari atualizando PWA v0.9 instalada.
2. Rede instável real, dispositivos simultâneos e integridade/idempotência.
3. Revisão manual de teclado, foco, leitores de tela e zoom 200–400%.
4. Piloto pedagógico documentado com turma real.
5. Homologação de rollback RTO/RPO, revisão de segurança e decisão GO assinada.

**Publicação:** PR #35 integrada na `main`; metadata `0.10.0`; backup V56 validado; release-gate final executado no SHA exato após CI. Tag `v0.10.0` é referência canônica. Evolução de conteúdo/projetor e novas melhorias funcionais/UX ficaram em [v0.11](ROADMAP_V0_11.md).
