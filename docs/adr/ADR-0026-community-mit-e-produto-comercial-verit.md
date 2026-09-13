# ADR-0026 — Community até v0.4 e linha proprietária a partir da v0.5

- **Status:** Aceito
- **Data:** 2026-08-31

## Contexto

O Arena Dev nasceu com uma fase Community destinada a validar arquitetura,
experiência de aula e adoção inicial. Essa fase deve permanecer estudável e
self-hosted sob MIT até a baseline v0.4.x.

A partir da v0.5, o projeto passa a concentrar diferenciais de produto,
evolução comercial, integrações e capacidades pedagógicas que pertencem à
linha proprietária. Manter a licença MIT depois desse ponto permitiria uso,
redistribuição, sublicenciamento e comercialização irrestritos de versões que
já fazem parte do produto proprietário.

## Decisão

1. As linhas `v0.1.x` a `v0.4.x` formam o **Arena Dev Community** e permanecem
   sob MIT nos snapshots correspondentes.
2. `v0.4.x` é a última linha Community.
3. A partir do primeiro commit da linha `v0.5`, Arena Dev passa a ser software
   proprietário e o repositório usa a **Arena Dev Proprietary License**.
4. Acesso ao código-fonte não concede, por si só, permissão de cópia,
   redistribuição, sublicenciamento, venda, hospedagem para terceiros ou criação
   de derivados além do que for autorizado por escrito.
5. Dependências e componentes de terceiros continuam regidos por suas próprias
   licenças; esta decisão não tenta relicenciá-los.
6. Distribuição a clientes, parceiros, instituições ou colaboradores deve usar
   instrumento escrito compatível com a licença proprietária.
7. Histórico, autoria, datas, mensagens de commit e rastreabilidade técnica
   devem ser preservados ao aplicar a fronteira de licença.

## Consequências

- `v0.4.x` continua sendo a última baseline comunitária/MIT;
- `v0.5+` pode concentrar diferenciais comerciais sem novos grants MIT sobre o
  código próprio;
- documentação corrente não deve descrever a linha proprietária como open
  source ou Community;
- o produto pode continuar self-hosted sem ser open source;
- componentes de terceiros mantêm integralmente suas licenças originais.
