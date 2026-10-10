# ADR-0068 — Governança editorial, proveniência e taxonomia de avaliações (proposta)

- **Status:** Proposto — **não aceito nem implementado**
- **Data:** 2026-10-10
- **Escopo:** produto/editorial, arquitetura, dados educacionais, direitos de conteúdo
- **Decisores pendentes:** responsável pedagógico, editorial/jurídico e produto
- **Linha:** discovery v0.11 / 11.5; eventual implementação em release posterior

## Contexto

O inventário real da 11.5 documentou 30 recursos globais ativos em uma instância, todos com origem MANUAL e sem os campos de proveniência **importada**, e 92 questões vinculadas às Atividades. Já existem `LearningTarget` (TOPIC/OBJECTIVE/COMPETENCY), `ContentRef`, `Provenance`, hashes e revisões canônicas.

A combinação não prova violação de direitos, mas falta um contrato explícito de autoria, licença, revisão editorial e cobertura por edição de edital. O projeto não deve criar um banco paralelo de conteúdos nem converter exposição em evidência de aprendizagem.

## Decisão proposta para futura aprovação

1. Preservar o conteúdo canônico da Biblioteca e referências imutáveis (ADR-0045, ADR-0048, ADR-0067); `subject` e tags continuam editoriais livres.
2. Direitos de uso são **entidade/decisão independente da origem técnica**: `MANUAL`, `AI`, `NOTION`, `FILE` e `URL` não representam licença nem autorização.
3. Um registro editorial futuro deve associar recurso e revisão/hash a fonte, titularidade declarada, evidência de licença/contrato, restrições, atribuição, revisor, decisão, escopo de uso e data; status inicial `UNVERIFIED`.
4. Estados candidatos: `UNVERIFIED` (informação insuficiente), `VERIFIED` (uso específico autorizado), `RESTRICTED` (limitações explícitas), `REJECTED` (uso negado). Decisões não são geradas por IA.
5. Catálogo de questões revisionadas só pode ser **opcional**. `ActivityQuestion` permanece responsável pela execução, e tentativas antigas não podem mudar quando a referência original for editada (ADR-0011).
6. Blueprint de edital/UC, quando aprovado, deve ser versionado, vincular alvos pedagógicos revisados a categorias/pesos, e registrar origem oficial e direitos por item.
7. Nenhum modo de apresentação, quiz ou Jornada registra `Mastery` por simples acesso/exposição; evidências seguem os contratos existentes, com avaliação de validade própria.
8. Não criar migration/API nesta ADR; implementar somente depois de piloto e aceite jurídico-editorial.

## Alternativas consideradas

- Reutilizar `subject` como objetivo pedagógico: **rejeitada**; é campo livre sem garantia de equivalência.
- Assumir que cadastro manual implica autoria/liberação: **rejeitada**; não há suporte factual.
- Publicar banco de questões completo na v0.11: **rejeitada para esta release**, pois altera escopo e exige governança prévia.
- Inferir direitos de texto importado por Notion/IA: **rejeitada**.
- Gerar blueprint e competências automaticamente por LLM: **adiada** até amostra auditada e revisão.
- Manter tudo em texto solto para sempre: **não recomendada**; impossibilita decisão rastreável.

## Consequências

- A descoberta editorial da 11.5 tem resultado útil e verificável sem mudar o runtime.
- O projeto poderá evoluir para concursos além da programação sem confundir Biblioteca, Jornada, Atividades e Arena.
- Exige participação de revisores qualificados e política de retenção/direitos, acrescentando trabalho de curadoria.
- Permanece risco residual de materiais históricos sem declaração estruturada de direitos; o novo modelo não deve reclassificá-los automaticamente.

## Condições para mudar o status para “Aceito”

- [ ] Piloto editorial com duas áreas distintas e corpus selecionado sob direitos claros
- [ ] Responsável jurídico/editorial define usos permitidos e evidências mínimas
- [ ] Docente valida modelo de objetivos, blueprint, classificação e critérios de qualidade
- [ ] Engenharia define esquema auditável, migração reversível e invariantes de snapshot/histórico
- [ ] Produto aceita explicitamente custo operacional de curadoria e prioridade de release
- [ ] Testes de autorização, idempotência, direitos, regressão pedagógica e isolamento planejados

Aprovação da PR que documenta a 11.5 **não muda automaticamente o status desta ADR para Aceito**.

## Referências

- [Auditoria de proveniência](../v0.11/11.5_EDITORIAL_PROVENANCE_AUDIT.md)
- [Blueprint e taxonomia](../v0.11/11.5_TAXONOMY_ASSESSMENT_BLUEPRINT.md)
- [Decisões e backlog](../v0.11/11.5_DECISIONS_AND_BACKLOG.md)
- [ADR-0011](ADR-0011-questoes-na-atividade-e-json-v1.md), [ADR-0048](ADR-0048-learning-target-content-ref-e-provenance.md), [ADR-0067](ADR-0067-material-presentation-v011.md)
