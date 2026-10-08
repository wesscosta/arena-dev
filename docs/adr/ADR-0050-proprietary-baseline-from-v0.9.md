# ADR-0050 — Baseline proprietária a partir da v0.9.0

- **Status:** Aceito
- **Data:** 2026-10-07
- **Supersede:** ADR-0026

## Contexto

A intenção de produto era encerrar a edição Community/MIT na linha `v0.4.x` e
seguir com desenvolvimento proprietário a partir da v0.5. A mudança de licença,
porém, não foi executada no repositório: as tags/releases `v0.5.0`, `v0.6.0`,
`v0.7.0` e `v0.8.0` continuaram contendo o arquivo MIT e foram distribuídas
nessas condições.

A v0.9.0 ainda não foi tagueada/publicada e, portanto, é o primeiro ponto de
release em que a política pretendida pode ser aplicada de forma inequívoca sem
reescrever o histórico.

## Decisão

1. `v0.4.x` permanece registrada como a última linha **Community planejada**.
2. As cópias históricas `v0.5.0`–`v0.8.0` já distribuídas com MIT preservam os
   direitos concedidos por aquela licença; não serão retroativamente declaradas
   proprietárias.
3. `v0.9.0` é a primeira baseline formalmente distribuída sob a **Arena Dev
   Proprietary License**.
4. O repositório canônico permanece privado e o produto atual deixa de ser
   descrito como open source ou Community.
5. Código, documentação e ativos próprios da v0.9+ são all-rights-reserved,
   salvo autorização/licença escrita em contrário.
6. Dependências e componentes de terceiros continuam sob suas licenças próprias;
   a licença proprietária não tenta relicenciá-los.
7. Qualquer distribuição comercial, acesso de clientes, parceiros ou equipe deve
   ocorrer sob instrumento escrito compatível com a licença proprietária.
8. O arquivo `LEGACY_LICENSE_NOTICE.md` registra o desvio entre intenção de
   produto e licenciamento efetivamente publicado.

## Consequências

- o produto pode evoluir comercialmente sem conceder permissões MIT às novas
  versões;
- versões históricas efetivamente MIT podem continuar sendo usadas/forkadas nos
  termos da licença que receberam;
- diferenciais implementados após essas versões deixam de ser automaticamente
  reutilizáveis por terceiros;
- documentação de marketing, README e release notes devem evitar chamar a linha
  atual de open source/Community;
- contratos comerciais futuros podem conceder direitos específicos sem alterar
  a licença padrão do código-fonte.

## Alternativas rejeitadas

- **Declarar v0.5–v0.8 retroativamente proprietárias:** rejeitado porque os
  artefatos foram efetivamente distribuídos com MIT.
- **Manter MIT indefinidamente:** rejeitado por contrariar a estratégia de
  produto vigente.
- **Apagar tags/releases históricas para ocultar o erro:** rejeitado porque não
  revoga cópias já obtidas e reduz a rastreabilidade.
