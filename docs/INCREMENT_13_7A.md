# 13.7A — UX Friction Pass + identidade contextual da turma

**Estado:** implementação preparada; gates pendentes.

## Objetivo
Reduzir fricção nos fluxos frequentes antes da publicação da v0.5.0.

## Alunos
- `Importar lista` e `+ Adicionar aluno` vão para o cabeçalho.
- Cadastro/importação abrem modais.
- Nome público ganha campo útil, botão legível e atalho Enter.
- Inativar/reativar/remover ficam no menu `⋯`.

## Home / Arena
- CTA ocupa até 76% da largura útil.
- Mais respiro vertical.
- Menor intensidade no estado base.
- Hover com maior contraste, sombra e elevação.

## Gerenciar turma
Seções: `GERAL`, `APARÊNCIA`, `ARQUIVAMENTO` e `MAIS OPÇÕES`.

Arquivar vira o fluxo normal para retirar turma usada da operação sem apagar histórico.
Exclusão definitiva permanece apenas para turma vazia.

## Identidade visual
- 8 cores curadas.
- 8 ícones semânticos.
- padrão `emerald + code (</>)`.
- sem hexadecimal arbitrário.
- accent apenas no hero, CTA, watermark e preview.

## Persistência
Flyway **V17** adiciona `classrooms.theme_color` e `classrooms.theme_icon`.

Todos os gates do release candidate precisam ser repetidos e backup/restore passa a validar V1–V17.
