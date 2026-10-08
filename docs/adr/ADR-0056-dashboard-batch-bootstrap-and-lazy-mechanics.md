# ADR-0056 — Bootstrap docente em lote e mecânicas sob demanda

**Data:** 08/10/2026 · **Estado:** aceita e implementada na branch `feat/v0.10-learning-loop` · **Issue:** [#36](https://github.com/wesscosta/arena-dev/issues/36).

## Problema verificado

O `ArenaApp.bootstrap()` chamava `fetchClassroomDomain`, `fetchSessionDomain`, `fetchScoreDomain` e `fetchActivityDomain`, cada um com `Promise.all` por turma. `fetchSessionDomain` ainda carregava `/participants` e `/mechanics` **para cada sessão ativa**, mesmo no Dashboard. Em banco de testes com mais de 350 turmas e 340 sessões ativas, o Chromium atingia `net::ERR_INSUFFICIENT_RESOURCES` e a Home falhava, embora backend e banco estivessem saudáveis. A causa era fan-out de requisições; não um defeito pontual das novas dinâmicas.

## Decisão

1. Endpoint docente **`GET /api/dashboard/bootstrap`** retorna uma projeção única e consistente das coleções já exigidas pela Home: `classrooms`, `students`, `enrollments`, `sessions`, `sessionParticipants` (somente sessões ativas), `scoreEvents` (incluindo status de reversão) e `activities` (incluindo questões configuradas). Uma requisição substitui chamadas O(turmas + sessões) no cliente.
2. `DashboardBootstrapService` consulta as coleções em lote com SQL estável (sem SQL por turma/sessão), sem tokens de dispositivos, senhas ou respostas individuais de avaliações. `ActivityService.listAll()` usa `ActivityRepository.findAllWithQuestions()` com fetch da turma e das questões para evitar N+1 Hibernate. Mesmos dados da API anterior, reformatados de forma a preservar os tipos do `ArenaData`.
3. O Dashboard só precisa de estado resumido da sessão. **Mecânicas, perguntas ativas, seleção e grupos não são hidratados para todas as sessões.** Ao entrar na Arena, `ArenaView` chama `/api/sessions/{sessionId}/mechanics` **uma única vez para a sessão atual**, mescla o runtime autoritativo e cancela o update se a tela foi desmontada. O frontend não supõe resultados de sorteio, XP nem avanço de roteiro a partir de resumos.
4. A rota continua sob autenticação `ROLE_TEACHER` e o modelo **operador único por instalação** da ADR-0053. Não implica multi-tenant/owner por turma; nenhuma mudança de licença, schema ou permissão pública.
5. Escritas (`create/update/delete` e pontuação) continuam nas APIs canônicas; `refreshClassroomDomain()` usa o mesmo bootstrap de lote. Nenhum dado foi removido ou migrado.

## Testes e critérios para a issue #36

- **PostgreSQL 17 / `DashboardBootstrapIT`:** cria 350 turmas/340 sessões ativas em banco descartável, testa vinculação do aluno, matrícula com preferred name, pontuação e reversão, atividade, projeção REST, 401 anônimo e ausência de tokens.
- **Ambiente volumoso autorizado, preservado:** ao testar a correção foram contabilizadas **374 turmas e 389 sessões**. Consulta HTTP do bootstrap: código 200, ~**0,126 s** e ~1,13 MB (uma observação local, **não** p95/SLA). A Home voltou a renderizar no Chromium em cenário de regressão não destrutivo.
- **Playwright `dashboard-bootstrap-scale.spec.ts`:** verifica uma requisição ao endpoint batch, ausência de fan-out `/mechanics`, `/classrooms/{id}/students` e `/sessions?classroomId=` durante o bootstrap, número correto de cards e leitura de `/mechanics` só para a sessão efetivamente acessada. Exige ausência de erros `ERR_INSUFFICIENT_RESOURCES`.
- Ainda é necessária validação de produto em escala maior, paginação/virtualização se houver milhares de turmas, auditoria de payload/tempo p95 e qualidade de rede real. Não usar um único tempo medido como promessa de SLA.

**Rollback:** reverter a branch/feature antes de merge mantém todos os dados, pois não há migração SQL. Não retomar o fan-out legado em produção. A release v0.10 permanece sem tag e com PR em rascunho, sujeita aos gates independentes de acessibilidade, PWA, XP, autoria, pedagogia e autorização.
