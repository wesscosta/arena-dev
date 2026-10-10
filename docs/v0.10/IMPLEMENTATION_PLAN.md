# Arena Dev v0.10 — Plano Técnico de Implementação

**Revisão:** 08/10/2026 · **Estado:** contrato técnico de planejamento, não implementação concluída.  
**Origem congelada:** tag `v0.9.0` / Flyway V48 · **Branch ativa:** `feat/v0.10-learning-loop`.  
**Fontes de decisão:** [roadmap da release](../ROADMAP_V0_10.md), [auditoria dos fluxos](../AVALIACAO_V0_10_ARENA_MATERIAIS.md), ADR-0045, ADR-0046, ADR-0049, ADR-0050, ADR-0051, ADR-0052.  
**Implementação incremental verificada:** P1-A passou a usar V51 + `InterventionType.PEER_DISCUSSION` e o `LearningCycle`/LearningCheck existentes, exigindo pelo menos dois respondentes e baseline sem gabarito revelado; ver [ADR-0054](../adr/ADR-0054-peer-instruction-through-learning-cycle.md) e [registro da execução](EXECUTION_STATUS.md). A presente especificação contém também itens futuros não implementados.
**Anexos executáveis de especificação:** [Contratos e persistência](API_CONTRACTS.md) · [Fluxos UX](UX_FLOWS.md) · [Matriz de testes](TEST_MATRIX.md).

## 1. Resultado esperado e definição do produto

A plataforma deve permitir que um professor **prepare/reutilize material → apresente → explore → verifique → intervenha → verifique novamente → interprete resultados → encaminhe estudo ou atividade** durante uma mesma sessão, com continuidade operacional e pouca navegação. As dinâmicas tornam-se instrumentos de estratégia didática, não brinquedos independentes. Alunos podem estudar individualmente em Jornada e, no futuro, em percurso vinculado a edital, sem que a Arena replique o LMS ou o banco de questões.

**North Star v0.10:** proporção de *ciclos pedagógicos válidos* que chegam à segunda verificação com registro de intervenção, mais confiabilidade do fluxo de aula. **Não** usar número de sorteios, XP, tempo de tela ou cliques como proxy de aprendizagem.

**Afirmativas pedagógicas fundamentadas, com limites:** aprendizagem ativa costuma beneficiar resultados em disciplinas STEM, mas não valida automaticamente qualquer gamificação; Peer Instruction prevê resposta individual → discussão → nova resposta; evidência pós-intervenção imediata observa progresso naquele instrumento, não domínio consolidado. O uso de feedback, autonomia e acessibilidade segue o DUA/UDL 3.0. Referências em §14.

### 1.1 Públicos e jobs-to-be-done

| Contexto | Principal trabalho | Sucesso observável | Limite v0.10 |
|---|---|---|---|
| Docente de TI, gestão, serviços ou outra área | Conduzir aula sem trocar de ferramenta a cada minuto; incluir todos sem constrangimento | Continuidade aula→resultado→ação; participação confirmada | Não automatizar decisão docente |
| Aluno em sala | Participar pelo celular, compreender enunciado, receber retorno claro | Resposta registrada sem duplicidade; alternativas acessíveis; recuperação de sessão | Não divulgar resposta/erro individual |
| Estudante de Jornada | Reabrir material relacionado à necessidade de estudo | Material certo, retomada de onde parou | Sem declarar mastery por abrir link |
| Estudante de concursos (futuro) | Estudar assuntos de edital, resolver questões verificáveis | Domínio reutilizável dos objetivos e avaliação | Editais, simulados, banco de questões e taxonomia completa fora do gate v0.10 |

### 1.2 Capacidades por domínio; contrato de propriedade

| Domínio | Fonte de verdade existente / evolução | Responsabilidade | Proibido nesta release |
|---|---|---|---|
| Biblioteca | `LearningResource`, `LearningResourceFormat`, `sourceUrl`, revision, proveniência | Material canônico + acesso/reuso contextual | Gerar nota por visualização; editor HTML |
| Arena e Roteiro | `ClassSession`, `SessionDynamic`, `ActivityStep`, `LiveStage` | Condução ao vivo; comando explícito do professor; projeção | Avançar automaticamente steps por votação/timer |
| Seleção de participantes | `ParticipantSelectionService`, `MechanicsService`; novo `DrawAttempt` | Escolha e desfecho confirmado de chamada | Misturar contagem de sorteio, presença efetiva e XP |
| Interação/Avaliação | `InteractionDefinition`, `InteractionRun`, `InteractionResponse`, `InteractionEvaluation` | Respostas, critérios, avaliação, distribuição | Novo motor independente de quiz/peer instruction |
| Learning Loop | V49 `LearningCycle`, `LearningEvidence` | Diagnóstico, intervenção, rechecagem, comparação descritiva | Inferir Mastery, substituição de prova/competência |
| Gamificação | `ScoreEvent`, ranking, achievements | Reconhecimento contextual auditável | Pontuar sem comando; coerção competitiva |
| Jornada/Concursos | Reader e progressão próprios; evolução futura de taxonomia/itens | Aprendizagem sequencial e contexto de estudo | Duplicação do runtime da Arena |

### 1.3 Priorização explícita e limites de capacidade

- **P0 — Deve existir para publicar:** segurança/autorização do LearningCycle; sorteio por rodada + resultado auditável em Grid/Roleta; continuidade contextual básica da Arena; Before & After completo; comparações sem métricas enganosas; testes E2E/integração; correções críticas de acessibilidade.
- **P1 — Desejável nesta release se P0 estiver íntegro:** Peer Instruction reutilizando runs e grupos; Clínica do Erro baseada em distribuições; material `LINK` da Biblioteca acessível no contexto de aula; recuperação simples; confidence optativa do aluno se houver capacidade de privacidade/UX.
- **P2 — Não bloqueia v0.10:** iframe Canva/HTML; Group by Response automatizado; Meta Coletiva; novas animações; painel analítico longitudinal; persistência cross-session de mastery.
- **Fora de escopo explícito:** ingestão de edital e provas, importador QTI, novo banco de questões, adaptive learning, hospedagem arbitrária de HTML/JS, LTI completo, agente IA avaliador automático, refatoração total de `ArenaApp.tsx`, descontinuação física de dinâmicas legadas.

**Regra anti-inchaço:** quando a capacidade P1 conflitar com P0, mover P1 para release seguinte e registrar ADR ou issue. O marco v0.10 é *qualidade dos fluxos*, não número de features.

## 2. Arquitetura de solução

```text
                        Professor / Arena cockpit
                                  │ comandos
                      Application / Orchestration
                         ┌────────┼──────────────┐
                 LiveFlow │        │              │
             ActivityStep │  LearningCycle    DrawAttempt
                         │        │              │
                   LiveStage  InteractionRun  DrawPolicy
                    (public)     │              │
                         │  Response/Eval    ScoreEvent (opt-in)
                         │      │
           Student Join/Projector  LearningEvidence
                                │
                  ResultActionService / summary queries
                                │
                 LearningResource (Biblioteca)
                     │                 │
                Arena placement   Jornada Reader
```

**Orientação:** manter Spring Boot/JPA/Postgres/Flyway e Next.js React do monólito modular. Ações docentes chamam *application services*; domínio decide invariantes; controller valida DTO; serviços expõem vistas específicas ao professor/aluno/projetor; WebSocket anuncia a versão do estado persistido após commit. **Nunca usar estado React como verdade de sorteio/XP/rodada.**

### 2.1 Source of truth e sequenciamento

1. `ClassSession` define turma, ciclo de vida e exclusão concorrente via `findByIdForUpdate` existente.
2. `LiveStage` responde exclusivamente qual conteúdo está público. `ActivityStep` determina ordem do roteiro; `SessionDynamic` permanece boundary de mecânicas legadas.
3. `InteractionRun` identifica cada aplicação de questão; `LearningEvidence` é observação com proveniência, não Mastery.
4. `DrawAttempt` identifica cada chamada e status, sem sobrescrever contadores legados. `ScoreEvent` é lançamento de XP; associação transacional por referência única ao draw attempt.
5. `LearningResource` é o documento canônico; o vínculo à aula é *placement*, não cópia. Links externos permanecem externos, sem integração presumida.
6. Realtime publica identificadores e revisões sequenciais após commit; reconexão obtém GET snapshot e ignora eventos mais antigos que o snapshot. Sem dependência de entrega WebSocket exactly-once.

### 2.2 Segurança estrutural

- A configuração Spring Security exige `ROLE_TEACHER` em `/api/**`, mas **papel global não substitui escopo por turma/sessão**. Criar `TeacherSessionAccess`/policy compartilhada, verificando vínculo legítimo de professor com classroom/session e papel específico de ação. Confirmar o modelo efetivo de ownership antes de codificar uma regra inexistente; adicionar vínculo com migração somente se necessário. Testar que o Professor A não lê/muda sessão do B mesmo com UUID conhecido.
- Estudante somente acessa contratos separados `/api/join/**` ligados à identidade temporária/participante, com respostas privadas e audience controlada. Não expor IDs sensíveis nem resultados individuais no projetor.
- Para comandos com efeito, CSRF já existe para API do professor, e permissões devem ser conferidas também na camada service; objetos referenciados devem pertencer à mesma sessão/classroom.
- Auditoria tem `SessionEvent` para eventos de domínio (resumo, não PII supérflua) e `ScoreEvent` para lançamentos/reversões. Promover logs por correlation ID e mascarar dados em telemetria.

## 3. Requisitos funcionais e regras de negócio

### RF-01 — LearningCycle: ciclo legítimo de evidência

- `DIAGNOSED`: vincular run de avaliação finalizada de interação com `producesEvidence=true`, objetivo presente e **evidências persistidas**; não basta `CLOSED` se não avaliado.
- `INTERVENED`: professor registra nota pedagógica curta (tipo opcional: explicação/discussão/material/atividade) e horário; note deve ser editável com histórico de correção ou append-only — decidir dentro da fatia e registrar auditoria, nunca silently overwrite.
- `VERIFIED`: associação a **run novo, da mesma sessão e objetivo**; para v0.10 P0 usar mesma `InteractionDefinition` como equivalência garantida por contrato. Permitido comparar questão equivalente diferente apenas em evolução futura com blueprint/calibração explícita.
- `readModel`: totais e pares de alunos que responderam aos dois runs; ausência é ausência, não erro. Recalcular de dados originais, não copiar resposta.
- `LearningCycleService` V49 **já existe em versão fundacional**; endurecer lacunas (evidência realmente finalizada, autorização teacher/session, duplicate/concurrent command, sequência temporal, acesso a dados) **antes** de UI.

### RF-02 — Sorteio justo com escolha de critério

- `ROUND_ROBIN_SHUFFLED` (*padrão para nova sessão*): pool de presentes que ainda não foram chamados na rodada; seleção aleatória uniforme entre elegíveis. Uma vez esgotado, iniciar próxima rodada com confirmação docente explícita ou renovação claramente sinalizada; não reiniciar silenciosamente. Modo funciona para 1 estudante com aviso de repetição inevitável.
- `BALANCED_WEIGHTED` (*compatibilidade legado*): proporção inversa a frequência histórica, evita repetição imediata com mais de um elegível, mas **não promete** cobertura total. Rótulo para professor deve informar isso.
- Critério `DrawPolicy` e visual `ParticipantSelectorPresentation` são independentes. Mudança de critério não apaga histórico nem estados; deve definir como inicia a próxima rodada, sem reclassificar retrospectivamente.
- Sorteio cria `PENDING` e exibe resultado sem atribuir participação/XP. Somente pode haver um `PENDING` por sessão.
- Resolução: `CONFIRMED` (participou sem XP), `CONFIRMED_WITH_SCORE` *é ação de comando, não novo estado* (fecha como `CONFIRMED` + `ScoreEvent`), `PASSED` (chamado sem participação/XP), `VOIDED` (seleção inválida, não consome chamada/rodada).
- **Cobertura:** número de estudantes distintos com tentativa `CONFIRMED` ou `PASSED` dentro da rodada. **Participações:** número de `CONFIRMED`. **Sorteios:** todas as tentativas exceto voided, explicitadas. **XP:** soma de `ScoreEvent` válido, após reversões. Não renomear `drawCounts` legado como participação.
- `PASSED` não cria inferência negativa nem penalidade automática; nunca exibir "omisso", "recusou" ou outro rótulo constrangedor no projetor.
- Idempotência: retry do mesmo comando e mesma chave retorna mesmo resultado, mas tentativa diferente com mesma chave é conflito; transação única e constraint DB impedem XP duplo. Se comando recebeu pontuação, não permitir nova pontuação via mesmo endpoint; lançamento manual independente permanece.
- Mudança de presença: não invalidar histórico; elegibilidade do próximo sorteio deriva do conjunto presente atual; tentativa `PENDING` preserva o snapshot e professor decide seu desfecho, mesmo se presença mudar. Participante removido da turma requer validação específica; regra padrão: permitir `VOIDED`, impedir XP se já não tem matrícula válida.
- Quando turma está vazia, erro de negócio informativo; sob dois professores concorrentes, lock ou constraint evita selecionar duas pessoas ao mesmo tempo.

### RF-03 — Continuidade entre ferramentas (contextual, não wizard)

- Mostrar no contexto da sessão **Objetivo atual** (se associado), **Material atual** (se associado), **Palco ao vivo** e **Próxima ação sugerida**.
- Contextual actions são derivadas da situação, sem persistir um segundo `activeDynamic` autoritativo: `DISCUTIR_RESULTADO`, `ORGANIZAR_PARES`, `VERIFICAR_NOVAMENTE`, `APRESENTAR_MATERIAL`, `RETOMAR_ROTEIRO`, `SORT_ENTER_NEXT`.
- A ação inicia uma operação já existente (`LearningCheck.repeat`, `GroupsService/MechanicsService`, `LiveStage`, `LearningResource`) ou abre drawer; não altera `ActivityStep.currentStepPosition` sem comando explícito.
- Não empurrar todo professor por fluxo fixo: aula pode começar no roteiro ou em dinâmica avulsa, e o contexto deve se recuperar após F5.
- Distinguir operacionalmente `Quiz` (execução de questão na aula) e `Verificar Aprendizagem` (questão com objetivo e evidência). Evitar rótulos redundantes; revisão de nav e compatibilidade devem usar estudo de usabilidade com docentes.

### RF-04 — Before & After, Peer Instruction e Clínica do Erro

- **Before & After (P0):** run inicial individual com resultado disponível ao professor; intervenção registrada; novo run com mesma definição; comparação de `correct→correct`, `incorrect→correct`, `correct→incorrect`, `incorrect→incorrect`, mais `notComparable`. Só computar *mudança* sobre os pares válidos e mostrar denominador; não comparar percentuais sem avisar sobre amostras diferentes.
- **Peer Instruction (P1):** resposta individual privada; discussão em duplas/grupos com tempo opcional; reapresentar mesma questão; professor vê mudança agregada; nenhum aluno vê a opção individual alheia. Teacher define quando revelar resposta correta; consentimento para expor nomes se houver outra dinâmica, default anon.
- **Clínica do Erro (P1):** mostrar distribuição de alternativas/distratores, sem rotular concepção automaticamente; vincular comentário docente à alternativa; permitir apresentar material e repetir. Não gerar "feedback científico" de IA sem fonte e revisão.
- **Confidence optativa (P1):** autopercepção `LOW|MEDIUM|HIGH|SKIPPED` registrada separadamente da coluna `learning_evidence.confidence` (que significa confiança de interpretação). Não usar confidence autodeclarada para ranking, notas ou progressão compulsória.
- **Recovery (P1):** professor identifica ponto não estabilizado e aciona nova intervenção ou direcionamento a Jornada; no MVP, referência explicita a ciclo/múltiplas tentativas, sem motor adaptativo.

### RF-05 — Gamificação com validade pedagógica

- XP pode reforçar engajamento e colaboração; nunca representa diretamente acerto, domínio ou aptidão para concurso. Pontuar é ação docente, separada do comando de sorteio.
- Ranking, Buzzer e Boss Battle permanecem **opcionais e compatíveis**, fora do percurso central de diagnóstico; professor tem opção sem competição visível.
- Meta coletiva (P2): resultado de aprendizagem contextual comprovável por instrumento nativo, não conversão de cliques em HP nem comparação pública que exponha alunos.
- Não introduzir moedas, streaks, loot boxes, animação de cassino, punição por não responder ou progressão baseada somente em NEXT.

### RF-06 — Biblioteca, Canva, links e material HTML

- `LearningResourceFormat.LINK` já permite URL externa; **não criar `CANVA` como novo tipo editorial obrigatório**. Registrar provider como metadata derivada/verificada e conservar URL canônica original; não extrair HTML de terceiros nem solicitar permissões desnecessárias.
- MVP v0.10: `resourceId` escolhido da Biblioteca → `resource placement` na Arena/roteiro/objetivo → botão **Abrir material** + **Voltar à aula**. O retorno resgata contexto, foco e stage anterior; aluno recebe material só se visibilidade/permissão permitir. Não pressupor que a URL seja pública.
- Se a presença do material no palco for relevante, a *apresentação segura por link/cartão* pode ser o primeiro tipo; vídeo/slides/PDF ficam na origem. Não tornar o editor do roteiro dependente da rede externa.
- Iframe piloto **P2, fora do release gate**: somente HTTPS e publicações explicitamente compartilháveis; allowlist de provedores, `sandbox`, `referrerPolicy`, CSP, fallback, consentimento para envio de dados a domínio terceiro e testes em projetor/mobile. Restrições `frame-ancestors` do fornecedor podem impedir embed. Nunca inserir código HTML/JS colado ou aceitar scripts arbitrários na origem autenticada.
- *View event* do material significa somente `opened`, e não `completed`/`submitted`/`evaluated`; capturar desempenho do simulador externo requer contrato futuro, não iframe.

## 4. Esquema de dados e migração

**Ver [API_CONTRACTS.md](API_CONTRACTS.md) para DDL proposto, DTOs, flags, endpoints, contratos e erros.**

- **V49** já versionada: `learning_intervention_cycles`; auditar validação cruzada das FKs e sessão/alvo, estados e concorrência. Como V49 ainda não foi publicada, correções **antes** de uso por outras bases de desenvolvimento podem ser consideradas com aprovação e `flyway repair` *não* usado como mecanismo de rollout; em qualquer ambiente onde V49 já tenha sido aplicada, usar V50+ aditiva em vez de mudar checksum. Plano conservador: manter V49 e acrescentar V50+.
- **V50 (proposta):** `draw_attempts` (status, rodada, policy, selectedStudent, idempotency); `draw_session_settings` (policy, round_number, epoch, presentation opcional). Estado legado `QUICK_DRAW` continua coexistindo por adapter. Constraints + indices únicos para uma seleção pendente por sessão e associação unívoca à XP.
- **V51 (proposta, se P0):** `learning_cycle_interventions`/revisões de notas para auditoria, versionamento de comando e eventual `source_ref` de material. Avaliar usar a intervenção atual de V49 por simplicidade antes de criar tabela extra: adotar somente se houver necessidade comprovada.
- **V52+ (condicional P1):** `learner_confidence` por `participant_id`,`run_id`; `resource_placements` somente se não houver vínculo reaproveitável em roteiro/contexto existente. Não criar tabela apenas para renderizar um link.
- Cada migração deve ser aditiva, reexecutável apenas via Flyway versionado, com EXPLAIN/índices para consultas críticas; zero backfill que atribua participação ao draw legado; plano de rollback por flag e preservação de dados.

## 5. UX e design operacional

**Ver [UX_FLOWS.md](UX_FLOWS.md).** A interface deve conservar modo ad hoc, não impor planejamento rígido. Critérios: tipografia e contraste legíveis, alvos mínimos WCAG AA, esforço adicional para AAA nos componentes sob controle da plataforma, voz/teclado e `prefers-reduced-motion`; não prometer conformidade AAA global sem auditoria. Telas docente, aluno e projetor precisam de política consistente de audiência. Ações pós-sorteio **no mesmo componente compartilhado** para Grid e Roleta.

## 6. Sequência técnica, gates por incremento e PRs

Cada incremento segue **discovery de dados e autorização → contrato + teste negativo → migration → serviço → API → UI professor → aluno/projetor → realtime/reconnect → E2E → docs/ADR → review → PR**. Evitar agrupar 10 features em um PR. Branch principal v0.9 permanece congelada até gate final.

| PR / fatia | Dependência | Alteração principal | Teste de aceite e gate | Estimativa relativa |
|---|---|---|---|---|
| P0-A: ciclo seguro | V49 existente | Endurecer LearningCycle e autorização; tornar retries/concurrency seguros | Flyway 17, cross-session/teacher, dupla verificação, dados ausentes | M |
| P0-B: sorteio domínio | Acesso/lock da sessão | DrawPolicy, DrawAttempt, V50, score idempotente, adapter legado | simulação 1/2/3/22, duplicidade, ausência, reinício, reversão | L |
| P0-C: sorteio UX | P0-B | Grid/Roleta, 4 desfechos, status e histórico sem confusão | Playwright professor + projetor, reload/reconnect | M |
| P0-D: continuidade do cockpit | P0-A + C | Context actions, novas affordances do roteiro e resultados | Fluxo livre e estruturado; navegação sem reset de stage | L |
| P0-E: Before & After | A + D | Orquestração e relatório de pares + intervenção | duas execuções, n participantes diferente, diferentes estados | L |
| P1-A: Peer Instruction | E + Groups | modo discussão e rechecagem, distribuição privada | resposta individual protegida, debate, nova resposta | M |
| P1-B: Error Clinic / Recovery | E | comentário por distrator e próxima ação/contexto | sem atribuição automática de diagnóstico, recuperação auditável | M |
| P1-C: material contextual | D + Biblioteca | LINK em roteiro/Arena/Jornada, seleção e retorno | conteúdo reutilizado e acessos corretos, origem privada bloqueada | M |
| P1-D: LearnerConfidence | A + InteractionRun | self-report isolado e opcional | privacidade, skip, ausência de efeito na nota | S–M |
| P2-A: piloto embed | P1-C + security gate | Configuração limitada por provider + iframe seguro | 2 testes reais + métricas; pode ser cancelado | Condicional |
| P2-B: Meta coletiva/Group by Response | E + Groups | ações adicionais, não módulos novos | piloto de valor antes da execução | Condicional |
| Gate final | P0 integral | CI, testes, perf, segurança, documentação, migrações | release candidate, rollback ensaiado; v0.9 preservada | M |

**Estimativas S/M/L são complexidade relativa, não prazo prometido.** A capacidade real de execução decide quais P1 entram, preservando o objetivo da v0.10.

### 6.1 Definição de Ready por PR

- História e cenário pedagógico registrados; objetos de domínio e migração identificados; matriz de estados/erros; autorização/aluno/projetor; flag e rollback; métricas; design responsivo; critérios de aceite vinculados a teste automatizado. Sem isso, issue permanece `needs-design`.

### 6.2 Definição de Done por PR

- Code review, validação schema + Hibernate + Flyway em PostgreSQL 17, testes positivos/negativos/concorrência, frontend typecheck/lint/unit, Playwright fluxo real, doc/API e handoff, rollback viável, nenhuma alteração não versionada. `main` permanece protegida e publicação depende do gate final.

## 7. Dependências e decisões críticas antes de codificar

| ID | Pergunta a resolver no começo da fatia | Recomendação / default | Bloqueia |
|---|---|---|---|
| DEC-01 | Ownership real professor↔turma/sessão (há apenas `ROLE_TEACHER` no chain) | Auditar auth/user/classroom e especificar policy autorizativa por recurso; negar por padrão | P0-A, B |
| DEC-02 | Estado do `LearningCycle` quando apenas CLOSED sem evidência, ou avaliação parcial | Exigir assessment finalizado + evidence coerente; preservar NOT_EVALUATED como não comparável | P0-A, E |
| DEC-03 | Duas interações podem compartilhar definition em uma mesma rodada? | Repetição cria outro run; score original intocável | P0-E |
| DEC-04 | Melhor local para lock de DrawAttempt | Transação/row lock em `ClassSession`; índice único parcial PENDING | P0-B |
| DEC-05 | Relação do `ScoreEvent` ao sorteio | Nova tabela de referência por `draw_attempt_id` única, sem overloading de `activityRef` | P0-B |
| DEC-06 | Backfill do legado | Nunca inferir participação; exibir contador legado como "vezes sorteado" | P0-C |
| DEC-07 | Reset da rodada sem reposição | Limpar somente conjunto da rodada; histórico permanece; aviso se turma com 1 aluno | P0-B |
| DEC-08 | Vínculo do material ao palco | Reutilizar referência existente quando for suficiente; se não, placement leve e versionado | P1-C |
| DEC-09 | Piloto embed melhor que link? | Gate de valor com casos reais; se não superar link, cancelar | P2-A |
| DEC-10 | A necessidade de auditoria das edições de intervenção | Append-only simples ou revision event, jamais update silencioso | P0-A |

## 8. Métricas de produto e telemetria (sem vanity metrics)

**Eventos instrumentados:** `session_started`, `draw_selected`, `draw_resolved`, `score_linked`, `learning_cycle_started`, `intervention_recorded`, `followup_evaluated`, `context_action_used`, `resource_opened`, `runbook_step_changed`, `reconnect_restored`. Dados sensíveis minimizados; não enviar nomes de estudantes para observabilidade técnica.

**Primárias operacionais:** completude do ciclo (denominador = ciclos iniciados; separar abandonados); tempo de retorno ao roteiro após resultado/material; % sorteios encerrados corretamente; erros por transição; p95 dos comandos ao vivo (meta inicial a calibrar com baseline, nunca número inventado).

**Pedagógicas descritivas:** participação nos dois runs, variação de acertos em pares, mudança por distrator, diferença de amostra, ações docentes de intervenção. **Não medir aprendizagem por XP, nuvem, votos opinativos ou tempo de iframe.**

**Hipóteses de validação com docentes (não KPIs garantidos):** P0 remove ações manuais/repetição indesejada; ação contextual reduz trocas entre telas sem obrigar sequência; iframe só entra se superar link no tempo de retomada/contexto sem regressão a11y. Coletar evidência em dois contextos de aula e registrar método de coleta.

## 9. Plano de testes, segurança, qualidade e release

**Ver [TEST_MATRIX.md](TEST_MATRIX.md).** Testes unitários de domínio, contratos HTTP e erro, IT em Postgres 17 e Flyway, CI, E2E teacher/student/projector, cross-tenant/IDOR, property-based/randomness em algoritmo (invariantes, não teste frágil de frequência aleatória), retry/out-of-order/realtime, recover F5, accessibility, devices móveis, light/dark.

**Gate mínimo:** 100% dos cenários P0 da matriz passaram; nenhuma migração quebrada; nenhuma escrita fora de sessão autorizada; não atribuição indevida de XP/evidência; snapshot e WebSocket coerentes; go/no-go registrado. Política de regressão da v0.9 e cutover Quiz/Poll/WordCloud continua separada de liberar v0.10; não apagar tables/bridge legados até prova operacional de reversão.

**Rollback:** feature flags por capacidade (`learningLoopEnabled`, `drawOutcomeEnabled`, `contextualNextActionsEnabled`, `externalPlacementEnabled`, `externalEmbedPilotEnabled`) e rotas compatíveis; migrations apenas aditivas; em falha, desligar UI/novo command path e recuperar snapshot legado sem converter registros novos de participação em contadores antigos. Ensaiar downgrade lógico, não rollback destrutivo de banco.

## 10. Riscos priorizados

| Risco | Prob/impacto | Mitigação antes do release |
|---|---|---|
| Sorteio/XP em duplo clique | Alto/Alto | lock DB, `requestId` único, unique PENDING e 1 ScoreEvent por attempt |
| Cross-session/tenant por UUID | Médio/Crítico | policy ownership no service, matriz de permissão e IT negativa |
| Dado legado contado como confirmação | Alto/Alto | métricas separadas e adaptador; zero backfill sem fato |
| Comparação pós-teste lida como mastery | Alto/Alto | denominação "variação nesta atividade" + pares válidos; disclaimer persistente |
| Fluxo novo quebra roteiro/projetor | Médio/Alto | commands sem auto-next, estado público versionado e E2E multi-cliente |
| Iframe quebra segurança/UX | Alto/Alto | manter P2, piloto allowlist, CSP, fallback e kill switch |
| Escopo da v0.10 impede entrega | Alto/Alto | P0 mínimo, P1 condicionado, P2 fora do gate |
| Data retention de evidências por session participants cascade | Médio/Alto | não fazer projeção longitudinal; ADR de retenção em release posterior |
| Acessibilidade visual/teclado deteriora | Médio/Alto | roteiro UX + Playwright/axe manual, contrastes e estados vazios |

## 11. Alinhamento com produtos de concursos e Jornada

- O curso/sala usa `LearningTarget` para objetivos; concurso utilizará mapeamento específico `Edital → Disciplina → Assunto → Subassunto`, com versões e proveniência, somente quando domínio 17.x existir.
- Questões de aula e concursos precisarão de *item canônico e versões*, não ser copiadas agora dentro da Arena. QTI 3.0 é referência de interoperabilidade **futura**, não modelo a ser implementado em v0.10.
- `InteractionRun` e evidências poderão ser compartilhados entre experiências apenas por contratos que incluam contexto, sujeito, versão do item, política de avaliação e validade temporal. A v0.10 prepara a separação conceitual sem alegar Mastery comum.
- O repertório didático (ex.: SQL) deve poder gerar: recurso na Biblioteca; demonstração em aula; verificação imediata; futuro caderno de questões/estudo autônomo sem duplicar origem. Cada contexto apresenta/avalia de forma própria.

## 12. Rastreabilidade e arquivos afetados

**Backend já existente:** `dynamic/ParticipantSelectionService`, `dynamic/MechanicsService`, `dynamic/MechanicsController`, `session/ClassSessionRepository`, `scoring/ScoreEventService`, `stage/LiveStageService`, `interaction/LearningCheckService`, `learning/loop/*`, `content/LearningResourceService`, `activity/ActivityStep*`.  
**Frontend:** `components/ArenaApp.tsx` (hotspot: extrair por fatia), `arena/selection/*`, `arena/live/*`, `lib/mechanics-api.ts`, `LibraryWorkspace.tsx`, `study/JourneyContentReader.tsx`, `ProjectorView.tsx`, `StudentJoinFlow.tsx`.  
**Persistência:** Flyway V39–V49, futuro V50+; integração real com PostgreSQL 17.  
**Testes:** `ParticipantSelectionServiceTest`, `ParticipantSelectorPresentationIT`, `LearningCycleTest`, `LearningCheckIT`, `LiveFlowIT`, `SessionEventIT`, novos IT de tentativa/score, Playwright.

## 13. Entregas de documentação e Governança

- Repositório = fonte canônica de contratos, testes, migrations e ADRs. Notion = visão de release, decisões, milestones e links rastreáveis, sem reescrever contratos em duas fontes.
- Em cada fatia: checklist de Ready/Done, PR, validações e evidências, atualização do roadmap, documentação de API, README se alterar capacidades públicas, handoff após conclusão. **Não declarar concluído por commit isolado**.
- PR final: apresentar matriz 100% P0, logs de IT/E2E, resultado de recuperação de conexão, plano de rollout/flag/rollback, inventário de alterações e decisão go/no-go. Tag somente depois do merge de release autorizado.

## 14. Fontes externas de fundamentação

- Freeman et al. (2014), meta-análise de aprendizagem ativa em STEM, PNAS: https://doi.org/10.1073/pnas.1319030111
- Crouch & Mazur (2001), Peer Instruction e discussão entre pares: https://mazur.harvard.edu/publications/peer-instruction-ten-years-experience-and-results
- CAST (2024), Universal Design for Learning Guidelines 3.0: https://udlguidelines.cast.org/more/downloads/
- Sailer & Homner (2020), meta-análise de gamificação, com efeitos modestos e dependentes de contexto: https://doi.org/10.1007/s10648-019-09498-w
- W3C WCAG 2.2 em português — alvos AA e critérios AAA específicos: https://www.w3.org/Translations/WCAG22-pt-BR/
- OWASP, JavaScript de terceiros em iframe e defesa em profundidade: https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html
- 1EdTech QTI 3.0 (interoperabilidade futura de itens): https://www.1edtech.org/standards/qti/index

**Ressalva metodológica:** pesquisas fornecem *fundamento de desenho*, não demonstram que a implementação específica da Arena Dev causará melhoria de notas. O piloto docente e os instrumentos de avaliação determinarão o benefício real.
