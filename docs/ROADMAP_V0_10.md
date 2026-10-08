# Arena Dev v0.10 — Learning Loop e Condução Coerente

**Data da revisão:** 08/10/2026. **Baseline congelada:** v0.9.0 (Flyway V48). **Branch:** `feat/v0.10-learning-loop`.
**Estado:** plano aprovado para implementação incremental; **não** é declaração de entrega ou release.
**ADRs:** [0045](adr/ADR-0045-jornada-e-estudo-sequencial-nao-workflow-de-atividades.md), [0046](adr/ADR-0046-arena-learning-core.md), [0049](adr/ADR-0049-evidence-nao-e-mastery-ia-consome-dominio.md), [0050](adr/ADR-0050-learning-loop-cycle-and-confidence-boundaries.md), [0051](adr/ADR-0051-selection-outcome-and-draw-policy.md), [0052](adr/ADR-0052-external-resources-as-placements.md).
**Auditoria:** [AVALIACAO_V0_10_ARENA_MATERIAIS.md](AVALIACAO_V0_10_ARENA_MATERIAIS.md).
**Plano técnico fechado para implementação incremental:** [v0.10/IMPLEMENTATION_PLAN.md](v0.10/IMPLEMENTATION_PLAN.md) (arquitetura, prioridade P0/P1/P2, contrato de dados, fluxos, testes e gates). Os itens planejados **não** estão implementados só por constarem no documento.
**P1-A em implementação validada:** discussão em pares integrada ao LearningCycle (V51), sem revelar gabarito antes da nova resposta e exigindo duas respostas individuais. Não é declaração de release; ver [ADR-0054](adr/ADR-0054-peer-instruction-through-learning-cycle.md).
**P1-B implementada na branch:** Clínica do Erro usa V52, distribuição de alternativas, notas docentes append-only e auditoria sem PII. Registro e bloqueio de escala em [ADR-0055](adr/ADR-0055-error-clinic-teacher-annotations.md).
**P0-G de escala do Dashboard:** a causa do N+1 de requisições foi eliminada na branch: API em lote, mecânicas por demanda e regressão de 350+ turmas. Ver [ADR-0056](adr/ADR-0056-dashboard-batch-bootstrap-and-lazy-mechanics.md); a release continua não publicada.
**P0-H de reversão XP:** implementada a proteção idempotente do ledger com Flyway V53, bloqueio concorrente, auditoria de sessão e XP revertido distinto da participação confirmada. Ver [ADR-0057](adr/ADR-0057-xp-reversal-idempotency-and-participation-independence.md).
**P0-I PWA/reconexão:** produção Docker agora contém service worker/offline/icons, SW sem HTML obsoleto em cache e cliente estudante reconecta sob sinal de online. [ADR-0058](adr/ADR-0058-pwa-versioned-offline-shell-and-connection-recovery.md); validação em Android/iOS e clientes v0.9 instalados ainda não realizada.
**Progresso verificável por fase:** [v0.10/EXECUTION_STATUS.md](v0.10/EXECUTION_STATUS.md), com separação entre código já integrado à branch e gates ainda pendentes.

## Tese de produto e North Star

A Arena Dev não é um gerador de dinâmicas, um editor de slides, um host genérico de HTML, nem um LMS duplicado. A proposta: **preparar e reutilizar materiais, conduzir participação, verificar aprendizagem, intervir e acompanhar a evolução**. As mesmas questões, objetivos, conteúdos e evidências servirão à Arena (aula síncrona), Jornada (estudo sequencial), Atividades (produção/entrega) e futuro contexto de Concursos (edital/disciplina/assunto/revisão), sem colapsar seus fluxos.

`Material ou questão → apresentação contextual → interação diagnóstica → leitura docente → intervenção → nova interação → comparação de evidências → encaminhamento opcional para Jornada/Atividade`.

Um material externo pode ser apresentado sem registrar aprendizado. Abrir, assistir ou interagir com iframe **não** significa conclusão, nota, participação confirmada ou domínio. Uma evidência vem de instrumento avaliativo com fonte verificável.

## Decisões inegociáveis

1. **Separar apresentação, algoritmo e resultado:** sorteio usa seleção autoritativa do backend; `GRID_SPOTLIGHT` e `WHEEL` são apresentações, nunca critérios. Não adicionar uma terceira animação para resolver justiça.
2. **Sorteio não é participação nem pontuação:** registrar tentativa e desfecho; XP somente em comando docente explícito e idempotente. Não deduzir nota, presença ou Mastery de alguém ter sido chamado.
3. **Dois critérios de sorteio:** `ROUND_ROBIN_SHUFFLED` (cobertura sem repetição até esgotar elegíveis; recomendação padrão para turmas) e `BALANCED_WEIGHTED` (compatibilidade/alternativa). Suportar apenas presentes; caso apenas um, explicitar repetição inevitável. Mudanças de presença e de critério respeitam integridade da rodada.
4. **Fluxo docente com contexto:** navegação não deve ser orquestração de palco. Roteiro (sequência explícita), dinâmicas ad hoc (modos), ações do resultado (contextuais), ferramentas (transversais) e palco público (projeção autoritativa) continuam separados. Não avançar o roteiro por Timer, respostas ou reveal.
5. **LearningEvidence não é Mastery; `learning_evidence.confidence` não é autoconfiança declarada do estudante.** Diagnóstico/followup são `InteractionRun`s distintos associados a um `LearningCycle`.
6. **Biblioteca é acervo canônico; Arena/Jornada são destinos de uso.** Recurso externo primeiro como LINK com CTA contextual e retorno claro; iframe somente se passar por experimento de valor e proteção. Sem HTML/JS arbitrário na origem autenticada.
7. **Segurança e inclusão:** isolamento por professor/turma/sessão, consistência de score, auditoria de estados, acessibilidade mobile/teclado/leitor, light/dark, reconnect e falhas explícitas.
8. **Sem big bang** da `ArenaApp`, sem criar microserviços, sem IA obrigatória, sem expandir sistema de gamificação antes de validar contribuição pedagógica.

## Plano técnico em fatias verticais

| Fase | Escopo | Aceite verificável |
| --- | --- | --- |
| 10.0 — Alinhar | Roadmap/ADRs/auditoria, classificação de domínios, baseline v0.9 | Decisões visíveis no README/índice/Status; ramo isolado; nenhuma alteração v0.9 |
| 10.1 — LearningCycle | V49, entidade/estados, API; completar validação de sessão/professor, persistência e integração | Flyway+Postgres, testes de autorização/concorrência/integração, não associar runs de outra sessão/definição; repetir não edita tentativa anterior |
| 10.2 — Sorteio íntegro | Backend para critério sem reposição + legado balanceado; `DrawAttempt` com `PENDING`, `CONFIRMED`, `PASSED`, `VOIDED` e score vinculado opcionalmente; transparência de contagens | 1/2/3/22 participantes; sem repetição dentro da rodada; resultado preservado após reload/reconnect; nenhuma pontuação automática; duplo clique idempotente; migração sem reclassificar dados legados |
| 10.3 — Sequência da Arena | Comandos de continuação pós-dinâmica: discutir resultado, verificar novamente, formar grupos, apresentar material, voltar ao roteiro; salvar contexto | Professor consegue seguir cenário end-to-end sem trocar telas de forma errática; não avançar automaticamente roteiro; projetor/aluno sincronizados |
| 10.4 — Before & After | Reaproveitar o LearningCycle/InteractionRun, comparação com denominadores e participantes pareáveis, intervenção documentada | Comparação descritiva transparente sem confundir aumento imediato de acertos com Mastery |
| 10.5 — Peer Instruction e Error Clinic | Dois runs ligados; debate em pares; ações sobre distribuições/distratores; reutilizar Groups/Timer/LiveStage | Sem duplicar motores; respostas privadas; erros não rotulados por IA sem evidência; professor mantém autoridade |
| 10.6 — Confidence e Recovery | Autopercepção optativa em modelo próprio; recuperação mediante novas observações e justificativa | Confidence sem mistura com EvidenceConfidence; comparação/recuperação auditáveis |
| 10.7 — Biblioteca em contexto (base) | Reutilizar `LINK`, prover ação Abrir material no contexto da Arena/Jornada/roteiro, retorno à aula, seleção de material e vínculo opcional com objetivo | Material localizável sem copiar seu corpo, sem interromper sessão/projetor, sem declarar resultado de aprendizagem por simples acesso |
| 10.7B — Experimento embed | Piloto de Canva publicado e URL HTTPS permitida, **fora do release gate obrigatório** | Só ativar após testes de 2 casos reais de aula, segurança, responsividade, teclado, fallback, política de URL e ganho operacional observável; se não passar, manter LINK externo |
| 10.8 — Convergência complementar | Agrupar por resposta, Meta Coletiva contextual; manter Buzzer/Boss compatíveis, desacoplar XP de evidências | Ações sobre resultados reais; comparação respeita amostras; não reescrever Boss antes de valor comprovado |
| 10.9 — Painel | Evolução por objetivo com antes/depois, taxa de participação, ausências e distribuição | Sem métricas infladas; visão professor + registro da intervenção e lacunas |
| 10.10 — Release gate | Backend/CI/E2E teacher-student-projector; privacidade, acessibilidade, concorrência, performance e rollback | Somente então publicar v0.10; manter cutover v0.9 dependente do gate operacional; Mastery v1 **não** incluído |

### Ordem real de implementação

A sequência é *segurança e contratos do ciclo* → *corrigir sorteio* → *coerência das ações entre dinâmicas* → *Before & After* → *Peer Instruction* → *Biblioteca contextual com links* → *piloto embed opcional* → *painel/gate*. As demais estratégias usam a mesma fundação e entram por fatia, não por simultaneidade artificial. Mudanças de escopo exigem revisitar esta ordem.

### Critérios específicos do novo sorteio

- Seleção **não consome** participação: é uma chamada pendente; outra seleção não é liberada enquanto houver resultado não resolvido.
- Ações do professor: `Confirmar participação` (sem XP); `Confirmar e pontuar` (XP explícito); `Passar a vez` (chamada válida sem participação/XP); `Anular sorteio` (erro operacional, não conta para cobertura; registrar motivo opcional).
- Modo sem reposição: sorteio aleatório uniforme entre os presentes ainda não chamados na rodada; quando esgotados, reabrir nova rodada; um `PASS` é chamado para fins de justiça, mas não confirmado; um `VOID` não consome a vez. Em caso de mudança de presença, reavaliar candidatos sem perder trilha; se o único presente já foi chamado, permitir repetição declarada.
- Modo balanceado mantém pesos do algoritmo legado e exclusão imediata do último elegível sempre que possível; rótulo claro de que a repetição pode ocorrer antes da cobertura total.
- **Métricas separadas:** `chamados na rodada`, `participação confirmada`, `sorteios anulados` e `XP concedido`; não renomear retroativamente `drawCounts` antigos como participações.
- `confirm + score` deverá ser transação idempotente, referenciada por id do sorteio e gerando no máximo um `ScoreEvent` desse comando. A pontuação rápida independente permanece disponível, mas não simula confirmação.
- Não produzir rótulo público de "omisso", "falhou", "recusou" nem penalidade automática. A natureza do convite é participação, não proficiência.
- Compatibilidade: endpoint legado `POST /draw` segue suportado durante migração via adapter/versionamento; corte após ensaios reais e telemetria.

### Aceite das ações contextuais da Arena

O contexto único da sessão mostra, sem mais menus permanentes, *onde estamos* (material/etapa/objetivo, se houver), *o que está público* no palco e *o que é possível fazer a seguir*. Exemplo: Nuvem → discutir termos; Votação → explorar distribuição; Quiz/Verificação → revisar erro → nova execução; Sorteio → confirmar/passagem/anular → próximo; Roteiro → próximo passo **explícito**. Timer/Presença/Grupos/Pontuação abrem ferramentas transversais. Sem exigir planejamento rígido para aula ad hoc.

### Decisão de Canva/HTML (gate de valor)

O formato `LINK` e `sourceUrl` já existem na Biblioteca; Jornada hoje abre link em outra aba. Portanto incorporar não desbloqueia acervo nem avaliação, e **não merece um subsistema novo no núcleo da v0.10**. V0.10 entrega primeiro *uso contextual com link*, não iframe.

Um visor opcional pode ser aceito se dois cenários reais (a) apresentação do Canva durante aula com retorno ao Learning Loop, e (b) simulador HTML externo sem controle de nota, mostrarem redução verificável da alternância de abas e manutenção do contexto sem falhas. Registrar hipótese, frequência de uso, tempo de transição, obstáculos de acessibilidade, fallback e satisfação docente. Se iframe não agrega, cancelar 10.7B sem bloquear a release.

Para o piloto: Canva somente por publicação/embed oficial; URL validada `https`, allowlist/config de fornecedores confiáveis, proteção contra SSRF caso backend faça validação, iframe com sandbox/restrição adequada, CSP `frame-src`, sem executar HTML bruto ou injetar `script`, fallback abrir fonte original, aviso de origem/terceiros. A página de destino pode impedir embed via `frame-ancestors`/`X-Frame-Options`. Resultados externos não viram evidências sem contrato e consentimento; LTI/postMessage sob contrato auditado é **futuro**, não premissa da v0.10. Pacote HTML enviado/hosted, código não confiável e rastreamento dentro de simuladores ficam **fora da v0.10**.

## Dependências futuras preservadas

- v0.11: conteúdo inteligente, questões com autoria/proveniência/revisão, taxonomia, assessment blueprint e vínculo Arena ↔ Jornada; HTML isolado apenas após threat model.
- v0.12+: editais, provas anteriores com fontes, simulados, desempenho/retomada para concursos; progressão auditável; LTI ou eventos externos somente se houver demanda validada.
- MasteryProjection requer identidade longitudinal/retenção, questão e target versionados, critérios de confiança e blueprint. `learning_evidence` atual referencia `session_participants` com cascata: não presumir persistência para toda a vida de estudo.

## Prova de conclusão

A v0.10 só é publicada após: professor conduzir aula com material e dinâmica, verificar, intervir e rever resultado com denominadores; sorteio com cobertura correta e encerramento explícito testado; aluno/projetor e reconnect consistentes; isolamento por professor/turma; Flyway + testes integrados + E2E e revisões de acessibilidade; roadmap e README atualizados; não degradar nem forçar cutover v0.9. O piloto iframe não é um bloqueador.
