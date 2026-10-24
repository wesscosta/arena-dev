# Learning Architecture — Roadmaps, Questões, Mastery e Progressão

**Nota de reavaliação 24/10/2026:** [material da Jornada → avaliação com proveniência/revisão → aplicação em Atividades/Arena → feedback e evidência](PRODUCT_REASSESSMENT_2026-10-24.md). Isso complementa os eixos 17.3/17.4/17.6 sem decretar versão de release, automatizar Mastery nem fundir XP com evidência. Respostas abertas, nuvem de conceitos, ritmo do professor e sandbox de código permanecem propostas condicionadas a design, segurança e piloto.


**Status:** planejado / pós-v0.8
**Definido em:** 02/10/2026
**Precedência:** não altera a sequência de fechamento da v0.8.

## Decisão de produto

A Biblioteca evolui de acervo reutilizável para uma infraestrutura de aprendizagem capaz de sustentar conteúdos individuais, roadmaps, editais, questões, validação de aprendizagem, revisão e progressão visual.

A regra central é:

> **Progresso de leitura não equivale a domínio.**

`Progress`, `Mastery` e `XP` são conceitos independentes. Concluir páginas, clicar em Próximo ou abrir 100% de um material não concede domínio.

## Encaixe no produto

- **Journey:** estudo sequencial contextualizado por turma/professor.
- **Library:** conteúdo reutilizável e roadmaps independentes.
- **Activities:** produção, prática, entrega e avaliação.
- **Arena:** experiência ao vivo.
- **Question Bank:** evidência estruturada, inclusive questões de concurso.
- **Mastery:** inferência auditável a partir de evidências.
- **Progression:** representação visual da evolução comprovada.

## Sequência pós-v0.8

| Incremento | Objetivo | Estado |
| --- | --- | --- |
| 16.6 | Knowledge & Retrieval Foundation | pós-v0.8 / opcional |
| 17.0 | Learning Architecture Audit & Evidence Model | planejado |
| 17.1 | Knowledge Taxonomy | planejado |
| 17.2 | Roadmaps & Edital Mapping | planejado |
| 17.3 | Question Bank & Provenance | planejado |
| 17.4 | Assessment Blueprint & Mastery | planejado |
| 17.5 | Review & Retention | planejado |
| 17.6 | Teacher Learning Dashboard | planejado |
| 17.7 | Meaningful Progression & Avatar | planejado |
| 17.8 | Adaptive Recommendations | opcional |

## 17.0 — Learning Architecture Audit & Evidence Model

### Objetivo
Definir o modelo de aprendizagem antes de criar tabelas, níveis ou gamificação.

### Análise obrigatória
- auditar `LearningResource`, Journey, Progress, Achievements, ActivityQuestion e ScoreEvent;
- localizar acoplamentos entre conteúdo, turma e avaliação;
- definir a unidade de domínio: página, conteúdo, KnowledgeNode ou competência;
- validar ownership, versionamento, autorização e proveniência;
- decidir como evidências atravessam diferentes roadmaps sem duplicar aprendizagem.

### Decisão recomendada
`KnowledgeNode` será a unidade semântica de conhecimento; conteúdo, roadmap, questão e edital apontam para esses nós.

### Gate
Nenhuma implementação de Mastery ou avatar começa sem uma separação explícita entre consumo, evidência e domínio.

## 17.1 — Knowledge Taxonomy

### Objetivo
Representar o conhecimento independentemente do material que o ensina.

Modelo inicial simples: árvore hierárquica com relações adicionais quando comprovadamente necessárias. Evitar knowledge graph complexo prematuramente.

Exemplo: `Banco de Dados → SQL → Consultas → WHERE`.

### Validação
- o mesmo nó pode ser usado por TDS, concurso e roadmap Backend;
- conteúdos diferentes podem ensinar o mesmo nó;
- nenhuma taxonomia exige duplicar `LearningResource`;
- mudanças não invalidam snapshots de Journey.

## 17.2 — Roadmaps & Edital Mapping

### Objetivo
Criar percursos de estudo reutilizáveis fora de uma turma e permitir que um edital seja mapeado para a mesma taxonomia.

`Roadmap` referencia `KnowledgeNode`/conteúdos; não duplica materiais.

Pré-requisitos devem distinguir `RECOMMENDED` de `REQUIRED`, preservando autonomia quando bloqueio não for pedagogicamente necessário.

Pipeline futuro de edital: `Edital → disciplina → assunto → subassunto → KnowledgeNode → conteúdos/questões`.

### Validação
- aluno pode participar de múltiplos roadmaps;
- domínio demonstrado em um nó pode ser reconhecido em outro roadmap quando a política for compatível;
- alteração de ordem não altera o conteúdo;
- roadmap e Journey permanecem conceitos distintos.

## 17.3 — Question Bank & Provenance

### Objetivo
Transformar questões em evidências reutilizáveis, inclusive questões de concursos.

Metadados mínimos: banca, ano, órgão, cargo/prova, disciplina, assunto/subassunto, dificuldade quando conhecida, resposta, explicação e origem.

Cada questão deve apontar para um ou mais `KnowledgeNode`.

### Proveniência obrigatória
Distinguir explicitamente: questão original de prova, adaptada, criada internamente e gerada por IA. Uma questão gerada não pode ser apresentada como questão real de uma banca.

### Análise jurídica/editorial
Antes de ingestão em escala, validar fonte, licença/direito de reprodução, material fornecido pelo usuário e política de armazenamento/exibição.

### Gate
Questão sem origem classificável, resposta verificável ou tópico associado não entra no conjunto usado para validar domínio.

## 17.4 — Assessment Blueprint & Mastery

### Regra central
Uma única questão correta não valida domínio. A seleção deve produzir cobertura mínima do tópico e reduzir falsos positivos por chute, memorização ou repetição.

`Progress` mede consumo. `Mastery` mede evidência de aprendizagem.

Estados iniciais sugeridos: `UNASSESSED`, `ASSESSING`, `INSUFFICIENT_EVIDENCE`, `DEMONSTRATED`, `CONSOLIDATED`, `REVIEW_DUE`.

### Assessment Blueprint
Cada validação define quantidade mínima, cobertura por subassunto, diversidade, questões já vistas e política de nova tentativa. Evitar seleção puramente aleatória por `LIMIT N`.

### Questões de concurso como validação
Usar conjuntos compatíveis com o conhecimento estudado, preferindo diversidade de formulação, ano e contexto. Em roadmap orientado a uma banca, ponderar seu estilo sem reduzir a validação à memorização do padrão.

### Feedback
O retorno deve indicar tópicos demonstrados e frágeis, não apenas percentual: `competência ✓`, `finalidade ✓`, `motivo ⚠`, `objeto ✗`.

### Gates pedagógicos
- leitura completa não gera Mastery;
- clique em Próximo não gera Mastery;
- uma questão isolada não gera Mastery;
- nova tentativa controla repetição de itens;
- evidências permanecem auditáveis;
- professor consegue explicar por que o estado de domínio foi atribuído.

## 17.5 — Review & Retention

### Objetivo
Revalidar retenção no tempo sem assumir que passagem de tempo significa esquecimento.

`DEMONSTRATED → REVIEW_DUE` indica necessidade de nova evidência, não perda automática de domínio.

Revisões devem usar poucas questões e variar itens equivalentes da mesma competência.

### Gate
O sistema deve conseguir diferenciar dificuldade pontual, questão problemática e perda consistente de desempenho antes de alterar a leitura pedagógica.

## 17.6 — Teacher Learning Dashboard

### Objetivo
Dar ao professor informação acionável sem confundir progresso, nota, XP e domínio.

Exibir separadamente: conteúdo estudado, domínio por KnowledgeNode, tentativas, dificuldades recorrentes, revisões pendentes e evidências que sustentam cada estado.

### Gate
O professor identifica rapidamente quem precisa de intervenção e em qual competência, sem depender de score opaco.

## 17.7 — Meaningful Progression & Avatar

### Objetivo
Representar visualmente evolução comprovada. O personagem é feedback de progressão, não mecanismo de pontuação.

Não conceder evolução por login, clique, leitura de página ou sequência `Next → Next → Next`.

Marcos válidos podem incluir primeiro tópico validado, conjunto de competências consolidadas, conclusão validada de roadmap ou disciplina.

Avatar, títulos e elementos cosméticos só entram depois que Mastery estiver estável e validado com usuários adultos para evitar infantilização.

### Gate UX/pedagógico
A progressão visual deve refletir domínio real, ser opcional/discreta quando necessário e não competir com o estudo.

## 17.8 — Adaptive Recommendations

### Objetivo
Personalizar revisão e próximos passos a partir de dados estruturados.

Primeiro usar regras explícitas. IA pode recomendar revisão ou selecionar material auxiliar, mas não deve ser a autoridade única que decide se o aluno sabe.

Exemplos futuros: aumentar dificuldade quando há evidência consistente; interromper uma avaliação quando a lacuna fundamental já está clara; recomendar revisão de um subassunto específico.

## Gates transversais de análise e validação

Todo incremento 17.x passa por cinco gates antes de ser considerado concluído:

1. **Domain Review:** responsabilidade correta, sem duplicar Journey/Activity/Library/Arena.
2. **Architecture Review:** modelo de dados, contratos, migrations, autorização, versionamento e reversibilidade.
3. **Technical Validation:** unitários, integração, E2E, migrations, build e observabilidade.
4. **Pedagogical Validation:** a interação mede o que afirma medir; critérios de evidência e feedback são defensáveis.
5. **UX/A11y Validation:** desktop/mobile, teclado, foco, contraste, reflow, linguagem e compreensão de Progress × Mastery.

## E2E crítico

`Roadmap → conteúdo → Progress 100% → Mastery UNASSESSED → validação por questões → diagnóstico → revisão → nova tentativa → Mastery DEMONSTRATED → progressão visual`.

Esse fluxo deve entrar no CI quando 17.4 for implementado.

## Observabilidade

Registrar início/conclusão de conteúdo, avaliações iniciadas/abandonadas, tentativas por tópico, questões com erro anormal, tempo até domínio, revisões e mudanças de Mastery.

Questão com taxa de erro extrema deve ser sinalizada para revisão; o sistema não pode presumir automaticamente que o aluno ou o conteúdo é o problema.

## Fora do primeiro MVP 17.x

- economia de moedas;
- ranking obrigatório;
- streaks como requisito;
- avatar complexo/cosméticos extensos;
- IA julgando respostas abertas sem critérios auditáveis;
- IRT/BKT/Elo/ML para mastery;
- knowledge graph complexo;
- adaptive testing sofisticado antes de dados reais.

## Critério global de conclusão

O sistema deve responder separadamente: **o aluno estudou?** (`Progress`), **demonstrou conhecimento?** (`Mastery`), **em qual conhecimento?** (`KnowledgeNode`), **com qual evidência?** (`Assessment/QuestionAttempt`), **de onde veio a questão?** (`Provenance`), **precisa revisar?** (`Review`) e **o que a progressão visual representa?** (`Progression`).
