# 16.5A — Library Core

**Status:** implementado
**Data:** 28/09/2026
**Base:** decisões do 16.5.0 Architecture Audit.

## Objetivo

Criar o núcleo persistente da Biblioteca sem duplicar o domínio de conteúdo e, principalmente, separar o lifecycle do recurso editável do lifecycle do conteúdo executado pela Journey.

## Implementação

### LearningResource evoluído

A entidade existente continua sendo a fonte canônica de autoria. A V37:

- torna `classroom_id` opcional para permitir recursos reutilizáveis;
- adiciona `library_visible`;
- adiciona `revision` monotônica;
- adiciona `archived_at`;
- mantém recursos V29–V32 existentes fora da Biblioteca por padrão.

Não foi criada entidade `ContentLibraryItem`.

### API da Biblioteca

Novo endpoint protegido do professor:

- `GET /api/library/resources`;
- `POST /api/library/resources`;
- `PUT /api/library/resources/{id}`;
- `DELETE /api/library/resources/{id}` arquiva logicamente.

Recursos da Biblioteca são globais no modelo single-teacher atual e possuem `classroomId = null`.

### Snapshot Library → Journey

`JourneyStage` agora materializa:

- body;
- format;
- source URL;
- source label;
- revision do LearningResource.

A V37 faz backfill desses campos para stages existentes.

O Student Reader passa a ler o snapshot da Journey. Alterar posteriormente um item da Biblioteca incrementa sua revisão, mas não modifica a Journey já materializada.

### Reuso entre turmas

`JourneyService` aceita:

- recurso legado pertencente à mesma turma; ou
- recurso explicitamente visível na Biblioteca.

Um recurso de outra turma que não esteja na Biblioteca continua rejeitado.

### Compatibilidade

A API legada `/api/learning-resources` continua disponível para o fluxo existente por turma. Recursos antigos não são promovidos automaticamente à Biblioteca.

## Invariantes

1. Biblioteca e Journey não compartilham conteúdo mutável em runtime.
2. Journey registra a revisão que materializou.
3. Arquivar item da Biblioteca não remove snapshot de Journey.
4. Student não acessa a API administrativa da Biblioteca.
5. Não existe ownerTeacherId fictício enquanto não houver identidade persistente de professor.
6. Ingestion continua sendo pipeline único; integração direta Biblioteca ← Ingestion fica para incremento posterior.

## Validação automatizada

O teste HTTP cobre criação global, uso em Journey de uma turma, atualização para nova revisão, preservação do snapshot antigo e arquivamento.

## Fora do 16.5A

- UI visual completa da Biblioteca;
- busca, tags e filtros;
- importação direta para Biblioteca;
- seleção de subtree H2/H3;
- histórico completo/diff/restore de revisões;
- compartilhamento entre professores;
- identidade persistente multi-teacher.

Esses itens devem avançar em incrementos próprios, sem reabrir a fronteira de snapshot definida aqui.
