# v0.10 — Aceite informado pelo operador (10/10/2026)

**Origem do aceite:** resposta explícita do operador nesta conversa: confirmou que o Safari/iOS, DevTools e os demais testes operacionais discutidos foram realizados/aprovados, e autorizou concluir a v0.10, fazer PR, merge, tag e release. **Modalidade:** declaração do responsável, não um relatório técnico do assistente.

## Declaração registrada

O aceite abrange, conforme confirmação geral do operador, os roteiros de operação discutidos para a v0.10: uso iOS/Safari, inspeção DevTools, atualização PWA, rede/concorrência, teclado/foco/zoom/leitor, piloto pedagógico e processo de reversão. Esta confirmação **não contém** identificação dos dispositivos, versões de SO, datas individuais dos cenários, logs de rede, capturas completas, métricas de turma, RTO ou RPO numéricos; não se pode afirmar que estes dados foram auditados pelo assistente.

**Responsabilidade:** o operador assume a decisão de aceite dos testes manuais e seus riscos residuais. Isso não elimina os gates técnicos da publicação: CI verde do SHA exato, backup validado, segurança e `release-gate.sh final` na `main`.

## Evidências técnicas independentes

- Ensaio sintético rollback v0.9/V48 → v0.10/V56 → restore V48: [resultado PASS](ROLLBACK_V56_SYNTHETIC_2026-10-10.md) (não demonstra RTO/RPO operacional).
- Backup de `arena_dev` produzido em 10/10, restaurado em PostgreSQL 17 isolado, checksum SHA-256 e Flyway V56 validados; caminho local privado `backups/arena-dev-arena_dev-20261010T031912Z.dump`. Não anexar dumps ao Git.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades de dependências reportadas em 10/10. Não substitui auditoria externa de segurança.
- CI, merge, gate final e publicação: verificar o SHA/tag efetivamente resultantes, sem presumir sucesso anterior.

## Decisão de escopo

- **Código candidato aprovado pelo operador para preparação da v0.10.0 estável**, condicional aos gates automáticos e ao release-gate final.
- **v0.11:** projeção sincronizada de material da Biblioteca, refatorações funcionais e UX/UI futuras, tratadas em nova branch e roadmap, sem integrar alterações adicionais à v0.10 congelada.
- Restrições mantidas: self-hosted com **um docente por instalação**, não multi-tenant/SaaS; não prometer Mastery longitudinal nem projeção de materiais na v0.10.
