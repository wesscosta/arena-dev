# v0.10 — Registro de execução incremental

**Data:** 08/10/2026 · **branch:** `feat/v0.10-learning-loop` · **v0.9.0 permanece congelada.**

## Incrementos efetivamente codificados

| Fase | Implementação verificada | Estado / gate pendente |
|---|---|---|
| P0-A — LearningCycle | V49 + API existente; validação de respostas/evidências, lock de sessão, followup com definição/sequência correta, GET comparison de observações pareadas, `LearningCycleIT` em PG17 | **Parcial**: somente conta docente global; falta ownership por professor, teste HTTP completo, auditoria do tipo/autor/intervenção e compatibilidade temporal |
| P0-B — Sorteio backend | V50 aditiva, `DrawAttempt` pendente/confirmado/passado/anulado, `DrawPolicy` sem reposição/balanceado, única pendência por sessão, rodada explícita, lock transacional, vínculo ScoreEvent único, idempotência de resolução, REST `draw-attempts`, HTTP 409 conflito | **Em homologação**: CSRF/HTTP, auditoria de eventos de seleção/desfecho e proteção bidirecional legado/v0.10 testados em PG17. Persistem teste de upgrade PWA/browser cache, eventos de presença e validação manual de fluxo |
| P0-C — Grid e Roleta | `useDrawSession`, 4 desfechos comuns e policy drawer, cobertura da rodada, distinção de XP e participação, suporte de GET após F5 | **Em homologação**: Playwright Chromium 15 cenários da Arena/fluxos críticos aprovados após corrigir overflow e colisão de botão contextual. Persistem inspeção manual de WCAG/zoom/mobile e teste de upgrade PWA |
| P0-D — Continuidade | `ArenaNextActions` sugere próxima interação, grupos e retorno ao roteiro sem avançar `ActivityStep` automaticamente | **Em validação**: ações foram movidas ao cabeçalho sem adicionar rolagem e não avançam o roteiro; faltam piloto docente e projeção contextual orientada por dados do resultado |
| P0-E — Before & After | `LearningCyclePanel` no `LearningCheckPanel`: iniciar diagnóstico, registrar intervenção, repetir run, vincular followup, exibir comparação de pares | **Em homologação**: Before & After passou E2E de diagnóstico/intervenção/nova resposta e comparação; faltam casos PARTIAL/sem pares, auditoria autor/tipo e validação de experiência por docente |
| P1-A — Peer Instruction | V51 `intervention_type` + seleção docente entre revisão/discussão, regra de duas respostas iniciais não reveladas, reuso de grupos/mesma questão, comparação pareada em LearningCycle | **Implementado na branch; em homologação**. Testes unitários/IT PG17 e E2E Chromium com dois estudantes aprovados; validar eficácia pedagógica com docente real |
| P1-B — Clínica do Erro | V52 `learning_error_clinic_notes`, histórico docente append-only, API de distribuição/distratores escolhidos, auditoria sem PII, registro idempotente e painel expansível | **Implementado na branch; em homologação**. IT/PostgreSQL, auth/CSRF e E2E isolado; avaliação pedagógica presencial ainda pendente |
| P1-C/D — Biblioteca contextual, confiança e recuperação | Não implementados nesta execução | **Pendente** |
| P2 — Canva/HTML embed, Meta Coletiva | Não implementados; exigem piloto de valor | **Fora do gate P0** |

## Incremento P1-A — Discussão em Pares (08/10/2026)

- Uma intervenção do `LearningCycle` agora declara `EXPLANATION` ou `PEER_DISCUSSION`. A migração V51 adiciona coluna e backfill do estado anterior sem reescrever V49/V50.
- Para `PEER_DISCUSSION`, servidor verifica baseline encerrado/avaliado, correção **não revelada** e **pelo menos duas respostas individuais**; UI explica a sequência e desabilita a opção se faltar evidência mínima. Não há questionário novo nem XP automático.
- O professor pode abrir a ferramenta de grupos, registrar debate e aplicar novamente a mesma questão; resultados são comparados por aluno pareável. Testes de domínio, integração PG17 e Playwright com **dois estudantes** provaram separação da primeira resposta e a nova avaliação. Veja [ADR-0054](../adr/ADR-0054-peer-instruction-through-learning-cycle.md).
- Permanecem não demonstrados: qualidade/tempo da discussão real, registro automático de participação efetiva nos grupos e aprimoramento de aprendizagem em longo prazo.
- O teste de baseline exige pelo menos **duas respostas** para o modo em pares; o caso de resposta única é bloqueado no servidor e apresentado como indisponível na UI. A classificação não representa prova de que houve debate presencial.

## Incremento P1-B — Clínica do Erro (08/10/2026)

- V52 aditiva cria notas docentes **append-only** sobre distratores de um `InteractionRun` encerrado e avaliado; exige contagem real de respostas na alternativa incorreta, não interpreta erro automaticamente e não cria outro motor de avaliação.
- API GET e POST por sessão/run, `commandId` idempotente, lock, proteção contra cross-session, validações negativas e `SessionEvent.ERROR_CLINIC_NOTE_ADDED` sem texto de análise/PII. A interface mostra distribuição e permite anotação em bloco expansível, sem alterar LiveStage/XP/mastery. Veja [ADR-0055](../adr/ADR-0055-error-clinic-teacher-annotations.md).
- E2E da Clínica foi aprovado em **ambiente de teste isolado**, criado com outro Compose project/database/portas, sem excluir dados de desenvolvimento. O GET do teste usa o `runId` autoritativo devolvido pelo POST de anotação para não depender do estado corrente sujeito a transições.
- **Bloqueio P0 de desempenho identificado ([issue #36](https://github.com/wesscosta/arena-dev/issues/36)):** ambiente de desenvolvimento acumulou **353 turmas e 343 sessões ativas** de testes. O carregamento da tela de turmas executa fan-out de requisições para matriculados/atividades/eventos/sessões e para cada `/mechanics`, causando `net::ERR_INSUFFICIENT_RESOURCES` no navegador. **Não está corrigido** por usar stack isolada; requer um read-model/batch do Dashboard, hidratação de sessões por demanda e teste de escala sem N+1 antes de publicar v0.10. Não apagar fixtures sem plano explícito.

## Observações arquiteturais e débitos que bloqueiam declarar release concluída

- **Fronteira formal (ADR-0053):** o backend mantém `InMemoryUserDetailsManager` com **uma conta `ROLE_TEACHER` por implantação**. Não existe associação professor↔turma. Testes HTTP confirmam role/CSRF em um único operador; não autorizam alegar multi-tenant. Não publicar SaaS com várias contas docentes independentes antes do domínio de identidade/ownership transversal.
- `DrawProtocolGuard` **impede mistura dos dois protocolos na mesma sessão** usando bloqueio transacional por sessão e responde HTTP 409. O GET moderno de sessão legada também falha de maneira explícita e o frontend orienta o docente. Ainda é necessário ensaio real de atualização de PWA/cache e documentação da transição.
- Projeção pública usa `LiveStageService.showDraw`, mas a extensão do protocolo de outcome para aluno/projetor e a experiência de roda após refresh devem passar por E2E.
- `ScoreEventService` publica ranking com método after-commit existente; revisão de event ledger com contexto `drawAttempt` e reversões precisa concluir antes do gate.
- `SessionEvent` agora registra `DRAW_SELECTED`, `DRAW_RESOLVED`, `DRAW_POLICY_CHANGED` e `DRAW_ROUND_STARTED`, sem nome em summary/payload. Revisar a exclusividade da audiência em versões futuras e garantir retenção adequada.
- No Before & After, apenas `CORRECT` e `INCORRECT` contam como pares comparáveis. `PARTIAL`/`NOT_EVALUATED` ficam fora da comparação binária sem serem confundidos com erro.
- A resposta do aprendizado é um **resultado imediato neste instrumento**, não Mastery longitudinal.
- Links Canva/HTML já se encontram representáveis como `LINK`; não foi implementado iframe. O piloto deve comparar com link simples, e não é bloqueador desta versão.

## Gates executados

**Resultados obtidos no ambiente autorizado durante esta execução:**

- `mvn -q -f backend/pom.xml test` → **exit 0, 172 testes unitários, 0 falhas e 0 erros** (`/tmp/v010-full-backend.log`).
- `mvn -q -f backend/pom.xml -Dtest=DrawServiceIT,DrawSelectionTest,LearningCycleIT,LearningCycleTest,ParticipantSelectionServiceTest test` → **exit 0**; testes de integração reais com PostgreSQL 17/Testcontainers incluindo Flyway V50, concorrência de sorteio e ciclo diagnóstico/intervenção/verificação (`/tmp/v010-core-tests.log`).
- `frontend/npm run typecheck` → **exit 0**; `frontend/npm test` → **300/300**; `frontend/npm run build` → **exit 0** (`/tmp/v010-final-types.log`, `/tmp/v010-final-unit.log`, `/tmp/v010-final-build.log`).
- Lint apresentou avisos preexistentes, sem erros (81 avisos na execução específica).
- **Testes HTTP adicionais (baseline anterior)**: `DrawHttpSecurityIT`, `DrawServiceIT`, `SecurityAndMigrationIT` e `LearningCycleIT` com PostgreSQL 17 — **11 testes aprovados** naquele gate, migrações Flyway V1–V50. **Novo gate V51** cobre o fluxo Peer Instruction com ≥2 respostas e proibição de gabarito revelado (logs `/tmp/v010-peer-two-tests.log`); consultar resultados finais da regressão completa desta rodada. Inclui CSRF, autenticação e bloqueio legado/novo.
- **Playwright Chromium completo anterior**: `npx playwright test` — **24/24 aprovados**, abrangendo ranking, cockpit em 1366–1920px, turmas com 1 e 22 estudantes, Grid/Roleta, resolução de sorteio, roteiro, Nuvem, Quiz, Votação, Buzzer, Boss, reconexão, Before & After e Biblioteca em mobile/ultrawide (`/tmp/v010-full-e2e.log`). Corrigido o painel de ações para não alterar altura do cockpit nem bloquear CTAs; recomendações acessíveis no cabeçalho.
- **Regressão completa P1-A / Flyway V51 (08/10/2026):** `mvn -q -f backend/pom.xml test` e testes direcionados `SecurityAndMigrationIT,DrawHttpSecurityIT,DrawServiceIT,LearningCycleIT` **exit 0** (182 casos reportados no conjunto de XMLs Surefire, sem falhas/erros). `frontend/npm run typecheck`, `npm test` (**300/300**) e `npm run build` **exit 0**. `npx playwright test` executado **sequencialmente** após validar backend: **25/25 E2E aprovados** (`/tmp/v010-peer-final-full-e2e.log`); inclui Peer Instruction com **dois estudantes** e a regressão de todo o cockpit. Os dois primeiros ciclos de E2E apresentaram falhas transitórias de carregamento sob concorrência pesada e timeout impraticável de teste com 12 combinações; corrigido o timeout por teste sem eliminar assertions, e executada novamente toda a suíte até passar. **Não alegar disponibilidade sob carga apenas por este resultado.**
- **Gate P1-B (08/10/2026, V52):** `mvn test` + IT direcionados com PostgreSQL 17/Flyway V1–V52 **exit 0**, relatório Surefire com **183 testes, zero falhas e zero erros**; `npm run typecheck`, `npm test` (**302/302**) e `npm run build` **exit 0**. Playwright Chromium **27/27 E2E aprovados** usando Compose de teste em portas/banco isolados, com `E2E_BROWSER_API_URL` na origem correta, incluindo registro/consulta da Clínica do Erro, Spotlight acessível, aluno/projetor, Arena e Biblioteca (`/tmp/v010-clinic-final-e2e-correct-urls.log`). A suíte isolada é um gate funcional, **não** certifica carga de 353 turmas, resolvida somente quando a [issue #36](https://github.com/wesscosta/arena-dev/issues/36) passar.
- **Ainda não executado/validado:** auditoria manual WCAG 2.2/zoom/foco com tecnologias assistivas, troca de versão por PWA/cache, teste de interrupção de rede real sob carga e homologação pedagógica presencial. Os testes Playwright geram dados sintéticos no ambiente local de desenvolvimento: **não** executá-los em produção nem confundir turmas de fixture com dados reais. Não tratar testes automáticos como certificação de acessibilidade, aprendizado ou rollout de produção.

## Próximo PR / próxima ação

1. Manter rollout restrito ao **operador docente único** (ADR-0053); antes de múltiplos professores, implementar owner/membership e autorização transversal a todos os domínios.
2. Validar manualmente keyboard/foco/zoom/contraste/mobile e ensaiar atualização de PWA/cliente legado; aplicar regressões completas com ambiente atualizado.
3. Fechar auditoria/reversão de XP, presença/rodadas e política de palco após anulação; ensaiar rollback lógico de flags.
4. **Corrigir o bootstrap N+1 sob muitas turmas/sessões (bloqueio P0 real)** antes do release, validar com 300+ turmas e repetir E2E sobre o dataset denso sem erro de recursos. Depois avançar P1-C/D: links Biblioteca/Jornada, Confidence e recuperação; executar piloto de `PEER_DISCUSSION`, Clínica e ações contextuais.
5. Não publicar tag, não forçar o cutover v0.9 nem promover `main` antes do gate final.
