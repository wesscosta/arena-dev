# 13.7B — Finish Polish & Safe Hard Delete

**Estado:** implementação preparada; gates pendentes.

## Objetivo

Concluir o passe de UX da v0.5 com scrollbars coerentes, modal de gerenciamento mais acabado,
arquivamento visível e uma zona de risco inspirada no GitHub.

## Arquivamento

Arquivar é reversível, então exige somente confirmação simples. Não exige digitar o nome.

## Exclusão definitiva

A exclusão passa a aceitar turmas com histórico quando:

1. não existe sessão ativa;
2. o professor digita exatamente o nome completo;
3. a confirmação é validada novamente no backend.

A exclusão remove dados pertencentes à turma: vínculos, device claims, sessões, participantes,
runtimes, timeline, atividades, questões, importações e ScoreEvents/XP.

O cadastro global de `Student` é preservado.

## ON DELETE CASCADE

Não adotamos cascade global a partir de `classrooms`.

O hard delete é transacional e explícito. Cascatas existentes continuam sendo usadas para filhos
estritamente pertencentes ao pai.

Isso é fail-closed: uma FK nova no futuro bloqueia a exclusão até que a política de retenção seja revisada.

## Schema

Nenhuma migration nova. O schema máximo continua **V17**.
