# ADR-0050 — Saneamento do histórico e fronteira proprietária v0.5+

- **Status:** Aceito
- **Data:** 2026-10-08
- **Relacionada:** ADR-0026

## Contexto

A ADR-0026 define a fronteira de produto: Arena Dev Community/MIT até v0.4.x e
linha proprietária a partir do primeiro commit da v0.5.

O repositório não aplicou corretamente essa decisão ao arquivo `LICENSE` e aos
metadados públicos das linhas v0.5–v0.8. Antes da publicação da v0.9.0, foi
decidido sanear o histórico canônico para que a árvore versionada reflita a
fronteira de produto correta.

## Decisão

1. Preservar integralmente todo o histórico até `v0.4.0`, inclusive o SHA
   `ccfb7f937e7ac7db330cfa5e54c3e3816b69962f`.
2. Reescrever somente os descendentes posteriores à v0.4.0, começando pelo
   primeiro commit da linha v0.5.
3. Aplicar a **Arena Dev Proprietary License** a todos os snapshots v0.5+.
4. Corrigir README, release metadata e ADR index onde a linha proprietária ainda
   era descrita como Community/open source/MIT.
5. Preservar autoria, datas, mensagens e ordem dos commits.
6. Manter um bundle privado anterior à reescrita e um mapa dos SHAs/tags para
   auditoria.
7. Não alterar a licença nem a história das linhas Community até v0.4.x.
8. Manter as licenças próprias dos componentes de terceiros.

## Consequências

- os SHAs v0.5+ mudam porque o conteúdo versionado mudou;
- links externos para SHAs antigos podem deixar de representar o histórico
  canônico;
- tags v0.5–v0.8 passam a apontar para os commits reescritos;
- v0.4.0 e versões anteriores permanecem exatamente nos objetos Git originais;
- CI e gates posteriores devem validar a nova história antes da v0.9.0.

## Evidência

Antes do force-push foi produzido um bundle integral do repositório, além de
mapa de refs, commits e metadados das releases. A operação só pode ser
considerada concluída depois da validação das tags reescritas e de CI verde na
nova `main`.
