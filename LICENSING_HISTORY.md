# Histórico de licenciamento

## Fronteira canônica

A política de produto do Arena Dev é:

- `v0.1.x` a `v0.4.x`: **Arena Dev Community**, sob licença MIT;
- primeiro commit da linha `v0.5` em diante: **Arena Dev proprietário**, sob a Arena Dev Proprietary License.

A v0.4.0 permanece no commit original `ccfb7f937e7ac7db330cfa5e54c3e3816b69962f`
e não foi reescrita.

## Saneamento do histórico

Em 08/10/2026, antes da publicação da v0.9.0, o histórico canônico foi
reescrito a partir do primeiro commit da linha v0.5 para aplicar a fronteira de
licença que deveria ter acompanhado essa linha desde o início.

A operação preservou:

- conteúdo funcional não relacionado ao licenciamento;
- autoria;
- author date e committer date;
- mensagens e ordem dos commits;
- todo o histórico até v0.4.0 sem alteração.

Os SHAs a partir da v0.5 mudaram, como consequência inevitável da alteração do
conteúdo versionado. Um `git bundle` privado do estado anterior e o mapa de
SHAs/tags foram arquivados antes da operação para rastreabilidade.

## Escopo

A Arena Dev Proprietary License aplica-se ao material próprio do Arena Dev a
partir da linha v0.5. Dependências, frameworks e demais componentes de terceiros
continuam sob suas licenças originais.

Este registro descreve a correção do repositório canônico; não altera a licença
MIT dos snapshots Community até v0.4.x.
