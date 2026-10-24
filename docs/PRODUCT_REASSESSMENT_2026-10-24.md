# Auditoria documental e replanejamento — gates 11, 12 e evolução posterior

**Data da revisão:** 24/10/2026. **Natureza:** índice técnico/documental e síntese de discovery; não é autorização de redesign, migration ou release.

**Documento mestre no Notion:** https://app.notion.com/p/403f3eb198c38187a735cb36f988fc80

## 1. Fontes e regra de status

- v0.11 operacional: docs/v0.11/11.6_OPERATIONAL_HOMOLOGATION_PLAN.md e docs/v0.11/11.6_ACCEPTANCE_TEMPLATE.json (oito gates e declaração GO/NO-GO). Não mudar a verdade histórica destes artefatos.
- v0.12: docs/ROADMAP_V0_12.md e auditoria Figma-first no Notion (A0–A4). Identidade e protótipos **não aprovados**.
- Evolução de aprendizagem posterior: docs/LEARNING_VALIDATION_ROADMAP.md (17.0–17.8); não confundir números de incremento técnico com tags de release futuras.
- Histórico de execução: docs/STATUS_ATUAL.md, documentos rc.7 e plano executivo no Notion.
- **Fato mais novo verificado:** main em 907f4cc (24/10) com PR #100 (acessibilidade e saída do aluno, 6fa459a) e PR #101 (tempo total de Atividades, 907f4cc) mescladas com CI 3/3. Nenhuma dessas PRs significa GO operacional da v0.11.
- Planejamento de produto proposto não é funcionalidade implementada. Quando documentos antigos contiverem PRs abertas ou rc.7 como HEAD da main, tratam-se de registros de data anterior.

## 2. Matriz de gates e fronteiras

| Linha | Estado | O que comprovar antes de promover |
| --- | --- | --- |
| 11.0–11.5 | Fechamento técnico/descoberta documentada | Preservar contratos, autorização e proveniência; propostas não viram implementação |
| 11.6 | **NO-GO operacional** | 8 evidências: Safari físico, Android/PWA, VoiceOver/zoom, rede degradada/dois projetores, piloto docente, backup/rollback, segurança, owner GO/NO-GO |
| 11.7 e RCs | Melhorias técnicas e visuais entregues | Não extrapolar testes automatizados para homologação física |
| PR #100/#101 | **Merged na main**, CI 3/3 | Reabrir matriz de field gates conforme impacto dos novos SHAs |
| v0.12 | **Figma-first, A0–A4 ainda pendentes** | Auditoria de rotas/frames, design system, três pilotos, cobertura e aprovação explícita |
| Pós-v0.12 / 17.x | Discovery, sem versão de release atribuída | Arquitetura, proveniência, avaliações, custo/risco, piloto e decisão de produto |

## 3. Pontos de decisão acrescentados após uso em aula

### Experiência do professor — preparar, conduzir e analisar

A navegação atual expõe Sorteio, Quiz, Verificar aprendizagem, Votação, Nuvem, Buzzer, Boss e ferramentas de Timer, Grupos e Ranking. O professor precisa alternar entre painéis para desempenhar a mesma tarefa pedagógica. **Proposta para Figma:** Preparar (material, questões, roteiro), Conduzir (rodada atual, respostas, prazo, projetor, debate), Analisar (distribuição, respostas, objetivos, evidências e histórico). Ações especiais/contextuais preservam funcionalidades sem inflar a navegação principal.

Não criar um "Quiz 2" ou mais um painel. Preservar a decisão D12-DYN-01 do Notion: Quiz e Verificar aprendizagem convergem conceitualmente; Votação vira candidata a modalidade sem gabarito. Cutover de Quiz para InteractionRun **só** com shadow/equivalência/rollback; XP, LearningEvidence, confiança e Mastery continuam semanticamente distintos.

### Ritmo do professor e acompanhamento por questão

- Sequência preparada pelo professor; controle configurável de 30 s por questão (e sem limite), abertura síncrona, deadline de **rodada** autoritativo e reconciliável pelo backend.
- Recebimentos e distribuição visíveis ao docente enquanto a turma responde; gabarito público só após autorização explícita. Expiração não avança a questão ou revela resultados automaticamente.
- Entre rodadas: comentar, reexplicar, discutir, repetir, avançar; o roteiro registra a decisão docente.
- **Não confundir** com o deadline total da tentativa individual entregue na PR #101, nem com Timer auxiliar da Arena.
- Acessibilidade: acomodação de prazos por participante, teclado/zoom, baixo estímulo, política para contingência offline; validação WCAG 2.2.1 antes de obrigar o tempo.

### Material da Jornada → avaliação reutilizável

- Selecionar LearningResource/snapshot/versão/trecho, objetivos e competências PTD, número/tipos/dificuldade, avaliação ou condução ao vivo.
- IA propõe rascunhos; professor aprova/edita gabarito, critérios, enunciado e referência. Não publicar automaticamente; preservar proveniência/hashes e autoria editorial.
- Banco de questões com versões e snapshots das questões usadas em tentativas. Reutilização em **Atividades** e **Arena** sem duplicar dados ou confundir Jornada (estudo) com entrega.
- Reaproveitar ActivityQuestion e seus tipos MULTIPLE_CHOICE, TRUE_FALSE, OPEN, BUG_FIX, ANALYSIS, PRACTICAL e SCENARIO; hoje há criação manual, prompt/JSON, não arquivo/material → geração direta.
- Upload PDF/PPTX/DOCX requer limites de tamanho/MIME, extração e qualidade, direitos, privacidade, sanitização e custo.

### Respostas abertas → nuvem de conceitos e discussão

- Uma resposta discursiva preservada dá origem a três projeções: texto íntegro sob autorização docente, nuvem de termos/expressões normalizadas e síntese de argumentos/discordâncias apoiada por IA.
- Nuvem **não** é correção, nota ou Mastery; termos e sinônimos exigem moderação e remoção de PII; texto original nunca se perde e o aluno não tem autoria exposta publicamente por padrão.
- Reusar mecanismos de WordCloud/InteractionRun/realtime depois da auditoria, evitando painel redundante.
- Correção de código e SQL exige executor isolado com CPU/memória/tempo/rede restringidos; IA ajuda na devolutiva, não substitui testes determinísticos e docente.

## 4. Validação antes de construir

Piloto de Figma: professor seleciona material real de Banco de Dados da Jornada, gera dez questões (objetivas, discursivas e correção de código quando aplicável), revisa, publica, conduz rodada por rodada (30 s nas objetivas), vê distribuição sem revelar gabarito, comenta distrator, transforma respostas abertas em nuvem moderada e obtém relatório. Incluir poucos alunos, 24 alunos, conteúdo longo, dois projetores, rede ruim, mobile/Safari, zoom 200/400% e dados privados.

**Critérios de aceite:** menos troca de telas, fonte/denominador das métricas, avanço manual, nenhuma divulgação de gabarito/PII sem consentimento/política, prova de persistência e reconexão, segurança da correção de código e revisão editorial de todas as questões geradas.

**Sequenciamento:** 11.6/GO operacional independente → v0.12 A0–A4 de design → PRs técnicas pequenas após aceite de produto (modelo e proveniência, assistente de geração, rodada autoritativa, resposta aberta moderada, analytics, sandbox), priorizadas separadamente; 17.x permanece trilha maior de Mastery e taxonomia. Não comprometer tudo na v0.12 nem inventar uma v0.13.

## 5. Referências e consistência documental

- Notion reavaliação mestre: https://app.notion.com/p/403f3eb198c38187a735cb36f988fc80
- Notion gate v0.12: https://app.notion.com/p/3f9f3eb198c38136b319e5807170f8bf
- Notion Jornada PTD: https://app.notion.com/p/3f9f3eb198c3816d9e12d12d97cd17f9
- Notion plano de execução/PRs: https://app.notion.com/p/402f3eb198c381acb80be57cd808513f
- Docs: ROADMAP_V0_11, ROADMAP_V0_12, LEARNING_VALIDATION_ROADMAP, v0.11/11.6_OPERATIONAL_HOMOLOGATION_PLAN e v0.11/11.5_TAXONOMY_ASSESSMENT_BLUEPRINT.
- Não reescrever PRs antigas, relatório de campo ausente ou status das RCs como se fossem falsos: **acrescentar contexto temporal e ponte para o índice vigente**.
