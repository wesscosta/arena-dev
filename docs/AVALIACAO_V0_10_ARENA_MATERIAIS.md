# Auditoria de produto — fluxo da Arena, sorteio, Canva e HTML

**Data:** 08/10/2026 | **Base verificada:** branch `feat/v0.10-learning-loop` (v0.9 como baseline de produção). **Natureza:** auditoria de código/fluxos + pesquisa documental; não substitui teste com docentes em aula nem teste E2E.

## 1. Tese

A ferramenta ganha valor quando a aula mantém uma sequência **material → ação → evidência → intervenção → outra ação** com orientação ao professor, preservando o espaço de estudo individual na Jornada. Ter muitos botões ou incorporar sites não é, por si, avanço pedagógico. Não transformar Arena em editor de recursos nem em gerador de atividades.

## 2. Deficiências verificadas no código

| Evidência | Efeito observado na arquitetura/UX | Decisão |
| --- | --- | --- |
| `ParticipantSelectionService` usa pesos inversamente proporcionais a `drawCounts + 1`, evita apenas o último selecionado | Sorteios podem repetir um participante antes de cobrir toda a turma | Modo sem reposição por rodada e modo balanceado explícito |
| `MechanicsService.draw` incrementa contagem e emite `DRAW_COMPLETED` imediatamente | Sorteio não prova participação; rótulo atual "Participações" é semanticamente incorreto | `DrawAttempt` + conclusão explícita; métricas distintas |
| `DrawSettingsDrawer` configura apenas apresentação (`GRID_SPOTLIGHT`/`WHEEL`); critério balanceado é fixo | Visual e justiça percebida confundidos | Critério separado da apresentação |
| Grid `onConfirm` só executa `closeSpotlight`; roleta "Confirmar e pontuar" pode criar score | Resultado diferente conforme apresentação; não há PASS/VOID | Ações normalizadas para ambos os visuais; XP opcional e auditável |
| `ArenaLiveChrome` tem Quiz, Verificar Aprendizagem, Votação, Nuvem, Buzzer e Boss como entradas planas, mais roteiro/ferramentas | Professor troca de ferramenta sem sugestão contextual de continuação; dois caminhos parecidos de avaliação | Ordenar por intenção docente e ações pós-resultado, mantendo compatibilidade com mecânicas |
| `useArenaToolState` mantém `activeDynamic` como estado de navegação local | Trocar de item do menu não descreve uma transição de fluxo pedagógico | Criar ações contextuais e preservar fonte autoritativa `LiveStage` |
| `LearningResourceFormat` é `MARKDOWN`, `PLAIN_TEXT`, `LINK`; `LibraryWorkspace` abre `LINK` externo; `JourneyContentReader` faz CTA em nova aba | Acervo externo já é possível; falta continuidade de condução, não novo formato de dados por si | Usar recurso canônico existente; destino contextual e fallback |
| `LearningCycle` V49 introduz baseline, intervenção e followup separados | Fundação ainda não oferece jornada completa de UX/segurança | Concluir fatia vertical antes de chamar feature pronta |

## 3. Redesenho leve da navegação (sem novos módulos em excesso)

**Evitar** uma navegação impositiva de cinco telas, que prejudica a condução espontânea. **Expor** no topo do contexto da aula: objetivo/material atuais (se vinculados), fase opcional (`Explorar` / `Verificar` / `Intervir`), estado público e sugestão pequena de próxima ação. O docente escolhe quando avançar. No menu: área de Condução/Roteiro; interações de participação (Sorteio, Nuvem, Votação), verificação (Quiz/Verificar Aprendizagem, diferenciados por intenção), e ferramentas transversais. Classificação visual não altera automaticamente `LiveStage`.

**Fluxos de maior valor:**

- Nuvem → abrir discussão, opcionalmente selecionar aluno/grupo, depois verificar; nuvem não é correção.
- Votação → interpretar distribuição, conversar e votar novamente quando pedagogicamente útil; opinião não produz acerto.
- Quiz/Verificar → revelar resultados, escolher explicação/grupos, iniciar Before & After; evidência só quando interação tem critério de avaliação.
- Sorteio → aluno escolhido → confirmar sem XP / confirmar com XP / passar / anular → próximo; nenhuma pontuação involuntária.
- Material → abrir sem perder sessão, voltar ao roteiro ou executar pergunta referenciada; não gerar progresso por exibição.

**Não modificar:** distinção Jornada=estudo, Atividades=entrega, Arena=síncrona, Biblioteca=acervo; Timer/Presença/Ranking transversais; controle de roteiro pelo professor; backend como fonte de verdade.

## 4. Avaliação Canva e HTML: ganho incremental, não substituto do núcleo

**Canva:** ganho quando apresentação/infográfico publicado fica acessível de forma contextual e reutilizável sem duplicar upload/manutenção. Não produz questão, resposta, participação nem dado de aprendizagem automaticamente. Como LINK já existe, o valor adicional de iframe é condicional: manter palco, retorno e navegação fluida. Os recursos publicados podem alterar conteúdo na origem; registrar URL, origem, data de verificação e *sem garantia de snapshot imutável*.

**Página HTML externa:** mais útil para simuladores educacionais do que para simples páginas informativas. Mas exibir em iframe não integra tentativas/resultados. Se o recurso não permite iframe ou tem navegação própria complexa, abrir em guia externa é melhor. Não dar ao usuário um editor ou host de HTML/JS na Arena v0.10; risco de XSS, cookies, permissões, foco, responsividade e manutenção.

**Não inventar progresso:** `opened`, `embedded`, `viewed` não são `completed`/`mastered`. Caso haja questão nativa depois de explorar o simulador, a evidência é dessa questão, não do iframe. Integrações profundas exigirão protocolo e threat model.

**Filtro de decisão para o experimento de incorporação:**

1. Dois cenários reais documentados: apresentação Canva e simulador HTML publicado, realizados por professor em aula.
2. Comparar link externo atual versus visor interno: passos/cliques, tempo de retomada do contexto, erros, acessibilidade e feedback do docente.
3. Avaliar se fullscreen/controle de slides, teclado, projetor e retorno funcionam melhor ou pior; exigir fallback sempre.
4. Demonstrar valor para Biblioteca e Jornada sem duplicar modelo; caso não cumpra, manter apenas link.
5. Não tratar o iframe como fornecedor de evidências ou notas; exigir autorização explícita para disponibilizar a estudantes.

**Resultado da auditoria atual:** recomenda-se `LINK` contextual como entrega certa; **incorporação iframe condicionada a piloto**, excluída do gate da release v0.10; pacotes HTML carregados e rastreamento de simuladores adiados.

## 5. Sorteio: semântica correta

| Ação | Conta como chamado? | Conta como participação? | XP? | Próximo sorteio? |
| --- | --- | --- | --- | --- |
| `Sortear` | Pendente de desfecho | Não | Não | Bloqueado até decidir |
| `Confirmar participação` | Sim | Sim | Não | Liberado |
| `Confirmar e pontuar` | Sim | Sim | Sim, só sob comando docente | Liberado |
| `Passar a vez` | Sim | Não | Não | Liberado |
| `Anular sorteio` | Não (anulado) | Não | Não | Liberado |

O modo de rodada completa sorteia sem reposição **até cobrir os alunos presentes e elegíveis** e só então reinicia a rodada; recusas/passagens não devem criar sanções. A alternativa de peso balanceado é útil para intervenção espontânea, mas não oferece cobertura completa. O professor escolhe a política no drawer, separada do visual Grid/Roleta.

**Pontos críticos de implementação:** atualização atômica contra sorteios concorrentes; chave idempotente da confirmação/pontuação; política de presença alterada; reinício e encerramento de sessão; métricas/estado após F5 e em múltiplas telas; histórico de legado sem backfill enganoso; migração do `SessionDynamic` atual compatível; autorização e auditoria. Não usar somente estado React.

## 6. Concursos e Jornada: o que é compartilhado

Mesmos conceitos canônicos: `LearningTarget` (evoluído em taxonomia), materiais, questões, avaliações/evidências e proveniência. Experiências diferentes: sala ao vivo tem professor e LiveStage; Jornada tem leitor e progressão individual; Concursos tem edital/ano/cargo/banca, questões por fonte e simulado. Não antecipar taxonomia complexa/Mastery em v0.10 e não duplicar motores de questões por interface.

## 7. Referências e limitações

- Canva — incorporação e atualização de designs: https://www.canva.com/pt_br/incorporar/
- MDN — restrições de iframe, sandbox e permissões: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
- MDN — CSP/frame-ancestors e impossibilidade eventual de embed: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- Pesquisa sobre discussão por pares e nova resposta: https://pmc.ncbi.nlm.nih.gov/articles/PMC7145884/

A pesquisa fundamenta estratégia de discussão com nova verificação, **não** comprova impacto de iframes sobre aprendizagem. A validação de benefício dos embeds é hipótese de produto a ser testada com docentes, não fato demonstrado.
