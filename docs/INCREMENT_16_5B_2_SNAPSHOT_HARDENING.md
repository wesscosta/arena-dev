# 16.5B.2 — Journey Snapshot Integrity Hardening

**Status:** implementado tecnicamente
**Data:** 28/09/2026
**Pré-requisito:** 16.5B.1

## Problema

A V37 introduziu snapshot de LearningResource em JourneyStage, porém o fluxo genérico de atualização da Journey chamava novamente a materialização do recurso. Assim, editar título, descrição, posição ou módulo de uma Journey podia substituir silenciosamente o snapshot r1 pela revisão corrente r2 da Biblioteca.

## Invariante

`learningResourceId` identifica origem/proveniência. Os campos `resourceSnapshot*` identificam a revisão materializada. Manter o mesmo `learningResourceId` em um update **não** significa solicitar nova materialização.

```text
Library r1 → materializar → Journey snapshot r1
Library r2 → update comum da Journey → Journey continua r1
```

Uma atualização futura r1 → r2 exigirá operação explícita de revision awareness no 16.5E.

## Implementação

### JourneyStage
- `updateConfiguration(...)` altera apenas configuração estrutural/pedagógica do stage;
- `materializeResource(resource)` é a fronteira explícita que grava associação e snapshot;
- `detachLearningResource()` remove associação e snapshot;
- updates normais não escrevem `resourceSnapshot*`.

### JourneyService
`applyStages()` compara a associação persistida com `learningResourceId` solicitado:
- mesmo recurso: preserva snapshot;
- recurso diferente: valida e materializa a revisão selecionada;
- remoção explícita: detach;
- origem arquivada já materializada não impede salvar a Journey;
- recurso arquivado continua inválido para uma nova associação.

### Structured Import
`JourneyDraftMaterializationService` agora separa configuração do stage da materialização inicial.

### Student Reader
`hasExternalSource` passa a ser derivado do snapshot quando ele existe. Body, format, sourceUrl e sourceLabel já usam snapshot-first com fallback apenas para conteúdo legado sem snapshot.

## Persistência

Nenhuma migration adicional. A correção fortalece a semântica da V37. A próxima migration permanece disponível para o 16.5C.

## Regressão coberta

O teste de integração da Biblioteca agora prova:
1. Resource r1 é materializado na Journey;
2. Library evolui para r2;
3. Journey é editada mantendo o mesmo Resource;
4. snapshot continua body/revision r1;
5. Resource é arquivado;
6. Journey continua editável e mantém r1;
7. restore não altera o snapshot.

## Fora do escopo

- botão “Atualizar para revisão mais recente”;
- diff entre revisões;
- histórico editorial;
- auto-update;
- locking adicional;
- Semantic Metadata/RAG.

Esses itens permanecem em 16.5C/16.5E.
