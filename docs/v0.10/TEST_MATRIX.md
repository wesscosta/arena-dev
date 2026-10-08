# Arena Dev v0.10 — Matriz de Validação e Critérios de Release

**Objetivo:** traduzir [Plano Técnico](IMPLEMENTATION_PLAN.md) em cenários automatizáveis e verificações de uso. IDs são planejados e não indicam testes já implementados. Os únicos testes executados na revisão anterior foram 5 testes `ParticipantSelectionServiceTest` + 1 `LearningCycleTest`, **antes das novas funcionalidades**.

## 1. Níveis e critérios de bloqueio

- **Unit:** invariantes de domínio determinísticas, policy de sorteio, semântica dos contadores, comparações e DTO.
- **Integration:** PostgreSQL 17/Testcontainers com Flyway V1–V51+, lock concorrente, FKs, rollback, ownership e emissão realtime after-commit.
- **Contract/API:** HTTP, CSRF, ROLE_TEACHER, professor dono da sessão, join/token do estudante, 4xx corretos, retry idempotente.
- **E2E:** Playwright com docente, aluno (inclusive outra aba/dispositivo) e projetor simultâneos, mobile, reconexão e roteiro estruturado/ad hoc.
- **Pedagogia/UX:** aula demonstrável com material, pergunta, intervenção, segunda tentativa, devolutiva honesta; teste com professor, sem supor efeito de aprendizagem por aparição na tela.

## 2. P0: seleção, sorteio e XP

| ID | Cenário | Resultado exigido | Nível |
|---|---|---|---|
| D01 | 0 aluno presente | 422 informativo; nenhum attempt/score | API/IT/E2E |
| D02 | 1 presente, duas rodadas | seleciona único elegível; aviso de repetição | unit/E2E |
| D03 | 2 presentes, rodada completa | ambos chamados antes de repetir; order aleatória | unit/property/IT |
| D04 | 3/22 presentes, rodada completa | cada presente no máximo uma vez por rodada até esgotar; sem depender da ordem dos IDs | unit/property |
| D05 | BALANCED_WEIGHTED | mantém regra ponderada e evita repetição imediata quando possível | unit/regressão |
| D06 | Visual Grid e Roleta | mesma política backend, mesmos desfechos, pontuação não automática | E2E |
| D07 | PENDING + novo sortear | 409; nenhuma nova tentativa; CTA bloqueado | IT/E2E |
| D08 | Confirmar sem XP | 1 participação e 0 ScoreEvent | IT/E2E |
| D09 | Confirmar com XP, duplo clique/retry | 1 participação, 1 ScoreEvent, retorno idêntico | IT concorrente |
| D10 | PASSED | conta como chamado, 0 participação, 0 XP | IT/E2E |
| D11 | VOIDED | não consome rodada nem pontua; mantém auditoria | IT/E2E |
| D12 | Dois professores com sessão igual disparando simultaneamente | uma tentativa pendente válida; lock/unique evita duplicidade | IT concorrente |
| D13 | Mudança de presença durante rodada | novos elegíveis corretos; histórico preservado; nenhum auto-void | IT/E2E |
| D14 | Reload do professor, aluno e projetor | restored GET snapshot coerente; sem nova escolha e com status correto | E2E 3 clientes |
| D15 | Retry resolução com mesma chave/payload distinto | mesma chave/payload: mesmo retorno; diferente: 409 | Contract/IT |
| D16 | Cancelar após já pontuado | não permite mudar tentativa encerrada; reversão de XP segue ledger, não silent delete | IT/E2E |
| D17 | Dados legados `drawCounts` | exibe "vezes sorteado" sem gerar participações retroativas | migration/IT |
| D18 | Troca de apresentação durante PENDING | tentativa continua, sem sorteio ou score duplicado | E2E |
| D19 | professor de outra turma com UUID | 403/404 e nenhuma mutação nem leitura | auth IT |
| D20 | ScoreEvent publica antes do commit rollback | cliente não vê XP que foi revertido por rollback | IT realtime |

**Propriedades matemáticas do round-robin sem reposição:** para rodada R, `count(distinct student_id where status in (CONFIRMED,PASSED)) <= present eligible count`, e não existe tentativa nova `PENDING` selecionando pessoa já chamada quando existe outra pessoa elegível ainda não chamada. `VOIDED` não altera conjunto chamado. Randomness: testar cobertura e pertencimento com RNG injetável, não porcentagens frágeis.

## 3. P0: LearningCycle / Before & After

| ID | Cenário | Resultado exigido | Nível |
|---|---|---|---|
| L01 | baseline sem objetivo de aprendizagem | rejeita antes de criar ciclo | unit/IT |
| L02 | baseline CLOSED mas avaliações pendentes | rejeita; não infere evidência | IT |
| L03 | baseline finalizada e evidência persistida | cria DIAGNOSED uma vez | IT |
| L04 | intervenção vazia / >2000 chars | 400/422 com mensagem legível; sem alteração | contract |
| L05 | verificar sem intervenção | rejeita | unit/IT |
| L06 | mesma execução como followup | rejeita | unit/IT |
| L07 | followup de outra sessão/objetivo/definição | rejeita sem vazamento | IT/auth |
| L08 | followup ainda aberta/não avaliada | rejeita, exige conclusão | IT |
| L09 | duas verificações concorrentes para mesmo ciclo | apenas uma vinculação válida | IT concorrente |
| L10 | transição legítima de 2 runs | preserva respostas/evidências de ambos | IT/E2E |
| L11 | 17 iniciais, 15 finais, 13 pareados | mostra n=13 na comparação pareada, informa ausências e denominadores | unit/IT/E2E |
| L12 | 0 alunos pareados | "Sem base para comparação", não 0% de aprendizagem | unit/UX |
| L13 | PARTIAL/NOT_EVALUATED | classifica como não comparável, sem falsificar acerto | unit |
| L14 | diferença entre n inicial e n final | não divulga "melhora da turma" por mera alteração de amostra | UX/contrato |
| L15 | professor não dono, sessão inexistente, aluno usando API docente | bloqueio sem dados individuais | auth IT |
| L16 | F5/reconnect durante verificação | estado correto sem duplicar runs | E2E |
| L17 | POST intervenção repetido | não perde histórico; idempotência/409 definidos | IT |
| L18 | aluno tenta revelar corretas antes do professor | não recebe resposta nem critério privado | auth E2E |

## 4. P0: operação integrada / UX / qualidade

| ID | Cenário | Resultado exigido | Nível |
|---|---|---|---|
| U01 | Aula ad hoc: Nuvem → discutir → Verificar | navega sem reset da sessão; stage público correto | E2E |
| U02 | Aula com roteiro: Slide → Poll → Questão | step só avança por ação docente explícita | E2E |
| U03 | Timer durante qualquer etapa | Timer não muda step/palco e recupera após F5 | E2E |
| U04 | Sorteio → PASSED → próximo | uma seleção de cada vez, score zero, sem exposição constrangedora | E2E |
| U05 | Material externo LINK → retorno ao roteiro | professor volta à mesma sessão/step; novo download não exigido | E2E |
| U06 | Projetor e aluno ao mesmo tempo | apenas conteúdo público, identidades/dados privados ocultos | E2E |
| U07 | WAN flutuante/desconexão WebSocket | GET restore, ordem de revisões, nenhuma transação duplicada | E2E |
| U08 | 360/390/768/1024/1440/ultrawide e zoom 200% | sem overflow lateral bloqueante; foco e CTA acessíveis | visual/manual |
| U09 | teclado/leitor/reduced-motion/light-dark | role/labels, foco visível, contrastes mínimos, animação opcional | axe/manual |
| U10 | sem rede, erro 4xx/5xx, loading | erro claro, botão retry seguro, estado consistente | E2E |
| U11 | falha de score depois de decidir confirmed with score | rollback total ou resolução explícita, não participação confirmada sem score prometido | IT |
| U12 | migração Flyway V49/V50/V51 em Postgres 17 | Hibernate valida, índices/checks executam, regressão v0.9 verde | IT/migration |
| U13 | flag OFF e rollback lógico | cliente legado permanece funcional, novos dados preservados; nenhum drop | E2E/IT |
| U14 | primeira aula real com professor e aluno | registro de passos, confusões e resposta ao fluxo; sem tratar entrevista como prova causal | validação docente |

## 5. P1/P2 não bloqueadores do gate P0

| ID | Caso | Aceite específico |
|---|---|---|
| P11 | Peer Instruction | pelo menos duas respostas individuais iniciais; baseline não revelada; discussão documentada; novo run da mesma definição; comparação pareada e nenhuma pontuação automática. **Automatizado:** `LearningCycleIT`, `LearningCycleTest`, Playwright `Peer Instruction protege primeira resposta...`; **pendente:** observação pedagógica com docente |
| P12 | Clínica do Erro | Distribuição real e anotação autoral append-only só em distratores incorretos escolhidos, sem diagnóstico por IA, notas privadas, retry idempotente e cross-session bloqueado. Cobertura: `LearningCycleIT`, `DrawHttpSecurityIT`, Playwright `Verificar aprendizagem...`; **pendente** validação presencial |
| P13 | LearnerConfidence | opt-in/skip, só próprio participante, sem impacto em XP e LearningEvidence.confidence |
| P14 | Encaminhamento a Jornada | link legítimo para recurso com permissão, sem inscrição ou progressão inventada |
| P15 | Biblioteca contextual | resourceId canônico, abertura e retorno preservam estado do palco |
| E01 | Canva iframe | comparação com link externo (cliques, retorno, acessibilidade, falhas); benefício comprovado ou cancelamento |
| E02 | HTML externo | URL HTTPS e política de iframe; sem execução de código arbitrário na Arena |
| E03 | CSP/sandbox | sem acesso ao token/sessão da Arena; allowlist, fallback e domínio terceiros |

## 6. Regra go/no-go e evidências

**No-go automático:** falha de acesso cross-tenant, XP duplicado, desfecho falso de participação, perda de dados em rollback/reconnect, Flyway inválido, respostas privadas expostas, mudança de step sem comando, regressão crítica de uso por teclado/projetor.

**Go somente com:** todas as linhas D01–D20, L01–L18 e U01–U14 pertinentes a P0 cobridas e verificadas (exceções explicitamente justificadas no relatório), builds e ITs verdes, changelog + migration report, evidências E2E, testes em dois tamanhos mobile e desktop, documento de gate assinado/registrado. Registrar condição de release, limitações P1 e resultado do piloto E01/E02 separadamente.

**Não prometer SLA/p95 ou benefício pedagógico sem baseline empírica.** Definir metas operacionais após instrumentação e primeira bateria de observações.

### Bloqueio P0 de escala do Dashboard — detectado em P1-B

**Reprodução ([issue #36](https://github.com/wesscosta/arena-dev/issues/36)):** banco de desenvolvimento com 353 turmas / 343 sessões ativas; bootstrap frontend dispara requisições fan-out `/api/sessions/{id}/mechanics` e outras por turma, causando `net::ERR_INSUFFICIENT_RESOURCES` no Chromium, apesar dos contêineres saudáveis. A UI mostra `Backend indisponível: Failed to fetch`. Este problema não foi solucionado pela execução em stack E2E isolada. Exigir read-model/batch e/ou hidratação sob demanda, limite de concorrência e teste regressivo com 300+ turmas, sem mascarar falha por timeout/retry e sem excluir dados existentes. **Bloqueia gate P0.**

### Issue #36 — regressão P0-G de Bootstrap

- **Backend:** `DashboardBootstrapIT` (350 turmas e 340 sessões + reversão XP + participant preferred name + atividade); GET anônimo 401, docente 200, payload sem tokens.
- **Frontend:** `dashboard-bootstrap-scale.spec.ts` confronta cards/sessões com a projeção, garante **uma só requisição** de bootstrap e **zero** chamadas individuais `/mechanics` na Home; ao abrir Arena, uma leitura runtime da sessão selecionada. Sem `ERR_INSUFFICIENT_RESOURCES`.
- **Amostra de desenvolvimento não descartada:** 374 turmas / 389 sessões; bootstrap 200 em 0,126s com 1,13MB (observação, não p95). Não confundir esse resultado com validação de milhares de turmas, latência WAN ou disponibilidade de produção. ADR-0056 e issue #36.

- **Compatibilidade dos modelos:** `frontend/tests/dashboard-bootstrap.test.ts` verifica `null` do banco convertido para campos vazios/`undefined` como nos antigos adaptadores (aluno, matrícula, recurso, XP e participantes); evita regressão silenciosa em edição de turmas ou atividades.
