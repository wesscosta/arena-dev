# Arena Dev v0.8.0 — Professor Experience, Journey & Content Library

**Estado:** release candidate / feature freeze da linha v0.8  
**Schema:** Flyway V1–V38  
**Base anterior:** v0.7.0 — Educational Integrations

## Escopo encerrado

A v0.8 consolida três experiências sobre o mesmo produto sem fundi-las em um LMS genérico:

- **Arena do professor:** cockpit de aula ao vivo, ferramentas contextuais, Participant Grid + Spotlight, Roleta opcional, Timer, Presença, Organização, Pontuação e Ranking da sessão;
- **Jornada do aluno:** estudo sequencial persistente, Reader, progresso/retomada, multi-turma, Live Hub, resgate por código e Achievements Foundation;
- **Biblioteca:** acervo global reutilizável, snapshots imutáveis na Journey, ingestão canônica revisável, metadata editorial e projeções Leitura/Estrutura/Mapa.

## Fechamento de 16.5

Os antigos cortes 16.5C–F foram fechados como um único produto coerente, sem criar funcionalidades apenas para satisfazer numeração de roadmap.

### 16.5C — Semantic Content Foundation

- Arena Canonical Markdown;
- `CanonicalDocument` transitório;
- canonicalização determinística e SHA-256;
- outline H1–H6 derivado e reconstruível;
- ingestão revisável para a Biblioteca usando adapters existentes;
- Leitura, Estrutura e Mapa a partir do mesmo `LearningResource`.

### 16.5D — Organization & Discovery

- busca por título, resumo, assunto e tags;
- filtros combináveis por assunto, tag e idioma;
- facets e ordenação;
- paginação e vocabulário controlado ficam adiados até existir volume real que os justifique.

### 16.5E — Revision Awareness

- a revisão só avança quando o conteúdo materializado muda;
- metadata editorial é revision-neutral;
- Biblioteca mostra revisão corrente versus snapshot usado por Journey;
- atualização de snapshot é explícita e permitida somente em Journey `DRAFT`;
- Journey publicada e Reader preservam a revisão já materializada.

### 16.5F — Library Closure

- reuso Biblioteca → Journey e Journey → Biblioteca sobre a mesma fronteira de snapshot;
- archive/restore sem invalidar snapshots existentes;
- exportação Markdown para portabilidade;
- reuso em lote, marketplace, compartilhamento institucional e histórico editorial avançado ficam fora da v0.8.

## O que não entra na v0.8

- Knowledge/RAG, embeddings, vector store, reranking ou chatbot;
- taxonomia rígida/Knowledge Graph;
- banco de questões e Mastery do eixo 17.x;
- novas dinâmicas da Arena;
- reestruturação do Interaction Engine planejada para a próxima linha.

## Invariantes de release

- backend continua autoridade de sessão, seleção, presença e score;
- `ScoreEvent` continua fonte de verdade de XP;
- Journey não é workflow de atividades;
- `/join` continua separado do workspace persistente do aluno;
- `LearningResource` continua fonte canônica da Biblioteca;
- snapshot da Journey não sofre refresh silencioso;
- conteúdo importado é revisável antes da materialização;
- estruturas derivadas (`outline_json`, futuro índice/chunks) não são fonte de verdade.

## Gates

**Evidência local de 06/10/2026:** release-gate.sh local passou com **21/21 E2E**; backup/checksum foi restaurado e validado em PostgreSQL 17 até **Flyway V38**. A publicação continua condicionada ao CI verde do mesmo SHA após merge.

Antes da tag `v0.8.0`, o mesmo SHA em `main` deve possuir:

- `mvn -B -ntp verify` verde;
- frontend tests, lint, typecheck e build verdes;
- E2E Chromium dos fluxos críticos, incluindo Biblioteca semântica;
- Flyway V1–V38 validado;
- backup PostgreSQL 17 com checksum e restore validado até V38;
- `git diff --check` limpo;
- CI verde no mesmo SHA;
- documentação e manifests alinhados em `0.8.0`.

O gate final é executado por:

```bash
scripts/release/release-gate.sh final \
  --ci-run-url <URL_DA_EXECUCAO_VERDE> \
  --backup <CAMINHO_DO_DUMP>
```

O script não cria tag nem GitHub Release automaticamente.

## Pós-v0.8

A v0.8 entra em **feature freeze** após o merge do release candidate. Correções `v0.8.x` ficam restritas a regressões, segurança, acessibilidade crítica e documentação. Novas capacidades seguem para as linhas posteriores, começando pela evolução arquitetural da Arena e pelo eixo pedagógico 17.x.
