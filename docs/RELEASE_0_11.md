# Arena Dev v0.11.0 — Material Presentation (candidata)

**Status: candidata `0.11.0-rc.1`, NO-GO operacional. Não publicada; sem tag nem GitHub Release.** Desenvolvimento 11.0–11.6 integrado à `main` (merge `2c1e011`, [CI 3/3](https://github.com/wesscosta/arena-dev/actions/runs/38098271861)). A publicação depende dos oito gates de [homologação 11.6](v0.11/11.6_OPERATIONAL_HOMOLOGATION_PLAN.md) e do aceite assinado validado por `scripts/release/v011-readiness.py`. Escopo: self-hosted com um único operador docente.

## Principais entregas da candidata

- Apresentação de material da Biblioteca na Arena: snapshot imutável por publicação (V57), sem segunda Biblioteca e sem expor o acervo pelo código do projetor. [ADR-0067](adr/ADR-0067-material-presentation-v011.md).
- Leitor seguro no projetor com controles explícitos de publicar/retirar e renderer Markdown único (11.2/11.4).
- Navegação sincronizada por `anchorId`, CAS por `stageVersion`, comandos idempotentes de seção (V58) e reconciliação após reconexão (11.3).
- UX responsiva, foco/rolagem, CSP e segurança do frontend, WebKit emulado em CI (11.4).
- Discovery editorial e de proveniência sem nova API/DDL; ADR-0068 apenas proposta (11.5).
- Gate técnico 11.6: E2E com dois projetores, offline/reconexão/revogação e verificador fail-closed.
- Coerência e acessibilidade (11.7): títulos e espaçamentos por papel tipográfico do Design System; cor da turma visível e adaptada ao tema claro; correções WCAG AA nos dois temas e contraste de texto em nível AAA (7:1) nos tokens do sistema, verificados por axe nos elementos mensuráveis; cores de turma em AA. **Mudança visual perceptível:** títulos de página a 30px e alinhados entre as páginas; controles de barra de ferramenta com 44px; tema claro menos luminoso; brilhos neon removidos; textos secundários mais contrastados; novo favicon e ícones da PWA com a marca da interface. [Detalhes](v0.11/11.7_COHERENCE_AA.md).

## Compatibilidade e implantação

- Migrações Flyway V57–V58, aditivas sobre V56. O retorno à v0.10 exige **restore do backup V56 pré-upgrade**; publicações e comandos de seção gravados após o upgrade são perdidos no rollback.
- Ensaio isolado: `scripts/release/rehearse-v010-v011-rollback.sh` (tag `v0.10.0` → candidata → restore V56 → v0.10). Usa apenas containers descartáveis e dados sintéticos.
- Gate final: `scripts/release/release-gate.sh final --ci-run-url URL --backup DUMP_V58 --attestation ACEITE_PRIVADO.json`, com metadata `0.11.0` exata na `main`.
- Clientes PWA v0.10 instalados precisam do gate `android_pwa_upgrade` antes do GO.

## Riscos residuais a decidir antes do GO

- CSP mantém `script-src 'unsafe-inline'` (bootstrap do Next.js). Aceitar com mitigação registrada ou migrar para nonce em release própria.
- `connect-src` permite qualquer host `wss:` por compatibilidade com WebKit. Somado ao `'unsafe-inline'`, um XSS inline teria um canal de saída para hosts arbitrários. Restringir às origens configuradas exige teste em Safari/iOS físico; incluir na revisão `security_privacy_authorization`.
- Direitos de material de terceiros dependem de responsável editorial/jurídico (ADR-0068 proposta).

## Publicação (somente após GO)

1. PR com metadata `0.11.0` integrado na `main`; CI 3/3 nesse SHA.
2. Ensaio de rollback executado no SHA candidato e registrado.
3. Backup V58 com SHA-256 validado por `verify-backup.sh`.
4. Gate final com aceite privado; tag anotada `v0.11.0` e GitHub Release apenas com autorização explícita do responsável.
