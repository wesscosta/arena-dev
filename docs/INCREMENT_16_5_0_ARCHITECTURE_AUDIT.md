# 16.5.0 — Architecture Audit: Content Library & Reuse

**Status:** concluído
**Data:** 28/09/2026
**Natureza:** gate arquitetural; nenhuma migration de Biblioteca deve preceder estas decisões.

## Objetivo

Validar o 16.5 contra o modelo real do Arena Dev antes de criar schema, evitando duplicar o domínio de conteúdo ou introduzir uma Biblioteca incompatível com Journey, ingestão e Student Experience.

## Componentes auditados

- `LearningResource`, repository, service e API;
- migrations V29–V32;
- `NormalizedDocument` e adapters de ingestão;
- `ContentIngestionService`;
- `JourneyDraftMaterializationService`;
- `JourneySection`, `JourneyStage` e `JourneyService`;
- leitura do conteúdo em `JourneyStudyService`;
- autenticação atual do professor e `SecurityConfig`;
- clientes frontend de Learning Resource e Content Ingestion.

## Constatações do código atual

### 1. LearningResource já é o conteúdo materializado

Não criar `ContentLibraryItem` paralelo. `LearningResource` já concentra título, resumo, corpo, formato, source type, URL/label e proveniência. V32 também registra referência da origem, instante do snapshot e SHA-256.

### 2. O escopo atual é Classroom, não Teacher

`LearningResource.classroom` é obrigatório e V29 possui `classroom_id NOT NULL ... ON DELETE CASCADE`. A API lista recursos por `classroomId` e proíbe mover recurso entre turmas.

Isso é incompatível com uma Biblioteca global reutilizável entre turmas.

### 3. Ainda não existe ownerTeacherId persistente

A autenticação do professor usa `InMemoryUserDetailsManager` e um único usuário configurado por properties. Não existe entidade Teacher/User persistente que possa ser referenciada com integridade pelo acervo.

**Decisão:** não inventar `owner_teacher_id` na V37. O 16.5 deve preparar ownership lógico para o modelo single-teacher atual e deixar a introdução de identidade persistente como pré-requisito para multi-teacher real.

### 4. JourneyStage usa referência viva

`JourneyStage.learning_resource_id` aponta para `LearningResource`; `JourneyStudyService` lê diretamente `stage.getLearningResource()`.

Consequência: editar um LearningResource referenciado pode alterar retroativamente a experiência de estudo. Isso viola a invariável desejada do 16.5: Biblioteca editável + Journey estável.

### 5. A proteção atual é insuficiente para snapshot

`LearningResourceService.delete()` impede excluir recurso em uso, mas `update()` permite alterá-lo. Logo, a existência de `ON DELETE SET NULL` em JourneyStage protege deleção, não mutabilidade.

### 6. Ingestion já possui a fronteira correta

Adapters produzem `NormalizedDocument`, source-neutral, com blocos estruturados e Provenance. O pipeline já suporta TEXT/FILE/MARKDOWN/NOTION e fallback/AI sem vazar APIs externas para Journey.

Esse pipeline deve ser reutilizado pela Biblioteca; não criar segundo parser.

### 7. A estrutura normalizada é transitória

`NormalizedDocument` preserva Heading 1–6 e Content durante ingestão, mas o estado persistido final é dividido em `JourneySection`, `JourneyStage` e `LearningResource`. Não existe hoje representação persistente do documento normalizado completo.

### 8. Materialization já cria snapshots de origem, não snapshots Biblioteca→Journey

`JourneyDraftMaterializationService` cria um novo LearningResource por DraftItem e registra provenance/hash. Isso congela a fonte externa no momento da importação.

Porém, depois da criação, JourneyStage e LearningResource continuam acoplados pela mesma linha mutável. São dois níveis diferentes de snapshot e não devem ser confundidos.

## Decisões arquiteturais

### D1 — Biblioteca é uma capacidade sobre LearningResource

Não criar `ContentLibraryItem`. Evoluir `LearningResource` para representar material reutilizável e manter o nome de produto **Biblioteca** apenas na UX.

### D2 — Separar Library Resource de Journey Snapshot

A Journey não deve executar conteúdo diretamente do recurso editável da Biblioteca.

Modelo-alvo:

```
External Source
      ↓
NormalizedDocument
      ↓
LearningResource (Biblioteca / editável)
      ↓ materializar snapshot
JourneyStage + snapshot de conteúdo
      ↓
Student Progress
      ↓
Achievements
```

A unidade exata do snapshot deve aproveitar a modelagem atual e não criar um segundo JourneyContent sem necessidade.

### D3 — Snapshot é obrigatório antes de reuso cross-Journey

Editar/arquivar um recurso da Biblioteca não pode alterar Journey já materializada, publicada ou com progresso.

### D4 — Proveniência é não destrutiva

Journey deve registrar origem/revisão para rastreabilidade, mas não depender do recurso da Biblioteca para leitura em runtime. Nenhum cascade da Biblioteca pode destruir conteúdo materializado na Journey.

### D5 — Revision simples antes de version history

O primeiro modelo deve usar revisão monotônica no LearningResource e registrar a revisão usada no snapshot. Histórico completo/diff/restore não é requisito do primeiro ciclo.

### D6 — Ingestion permanece único

Notion, Markdown, texto e arquivo continuam passando pelos adapters/NormalizedDocument existentes. Biblioteca é novo destino do pipeline, não novo pipeline.

### D7 — Estrutura H2/H3 não vira centenas de LibraryResources

Um documento importado pode preservar sua estrutura canônica. Seleção granular de subtree para Journey fica fora do primeiro vertical slice até definirmos a persistência estrutural sem duplicar JourneySection.

### D8 — Student não acessa Biblioteca

A Biblioteca é domínio de autoria do professor. O aluno continua acessando somente snapshots através da Journey e das políticas do 16.4.

## Mudança necessária antes da V37

O principal trabalho de 16.5A não é criar uma tabela nova: é **desacoplar o lifecycle de LearningResource do lifecycle de Classroom/Journey**.

A migration futura deve ser desenhada somente após definir:

1. como recursos existentes vinculados a Classroom serão classificados/migrados;
2. como representar recursos globais no modo single-teacher atual sem owner fictício;
3. onde ficará o snapshot executável da Journey;
4. como preservar dados existentes sem alterar progresso.

## Estratégia recomendada para dados existentes

Recursos V29–V32 já usados por Journey devem ser tratados como **conteúdo legado materializado**, não promovidos automaticamente a itens globais editáveis da Biblioteca.

A promoção para Biblioteca deve ser explícita ou realizada por migration controlada que preserve uma cópia/snapshot da Journey. Não reutilizar a mesma linha mutável como catálogo e runtime.

## Próximo incremento autorizado

**16.5A — Library Core**, precedido por um pequeno design/migration gate:

- definir modelo de ownership compatível com single-teacher e futuro multi-teacher;
- definir snapshot Journey sem duplicar conteúdo desnecessariamente;
- definir migration segura dos LearningResources atuais;
- somente então escrever V37 e API de Biblioteca.

## Fora do 16.5.0

Nenhuma tabela nova, endpoint novo ou UI nova é criada neste gate. O objetivo é impedir que implementação prematura cristalize uma fronteira incorreta.
