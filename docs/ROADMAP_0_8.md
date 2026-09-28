# Roadmap v0.8 — Professor Experience & Journey MVP

**Linha ativa:** v0.8
**Branch de execução:** `feat/v0.8-content-ingestion`
**Estado atual:** `16.3 — Journey Study Experience` em execução; `16.3.0`–`16.3.5` concluídos na branch.

A v0.8 valida duas experiências distintas sobre o mesmo domínio:

- **Professor / Ao Vivo:** cockpit operacional para condução da aula;
- **Aluno / Jornada:** estudo sequencial persistente, organizado em módulos/capítulos e conteúdos.

A versão não busca ampliar escopo indiscriminadamente. O foco é validar valor de produto antes de avançar para Journey, Mastery e gamificação persistente.

## Sequência oficial

| Incremento | Objetivo | Estado |
| --- | --- | --- |
| 16.0 | Professor Arena Experience | **Concluído · PR #21 mergeado** |
| 16.1 | Journey Core | **Concluído · PR #22 mergeado** |
| 16.2 | Learning Resources & Content Ingestion | **Concluído na branch · aguardando merge** |
| 16.3 | Journey Study Experience | **Em execução · 16.3.0–16.3.5 concluídos** |
| 16.4 | Journey Map | **Absorvido pelo 16.3; sem incremento separado no MVP** |
| 16.5 | Question Attempts & Skills | **Candidato pós-validação do 16.3** |
| 16.6 | Mastery básico | **Candidato pós-validação do 16.3** |
| 16.7 | Review | **Candidato pós-validação do 16.3** |
| 16.8 | Teacher Journey Dashboard | **Candidato pós-validação do 16.3** |
| 16.9 | Minimal Gamification | **Candidato pós-validação do 16.3** |
| 16.10 | Pilot, Metrics & Hardening | Planejado |

### Product Gate após 16.3

Os incrementos `16.5` a `16.9` não são uma fila automática. Só avançam após validação real da Journey como experiência de estudo: estrutura compreensível, retomada correta, leitura/conclusão com baixa fricção e progresso útil. Mastery, Skills, Review e gamificação persistente permanecem hipóteses de evolução até esse gate.
## 16.0 — Professor Arena Experience

### Objetivo

Transformar a Arena em um cockpit desktop de aula ao vivo orientado por ações, eliminando a navegação por abas conceituais.

### Implementado até 26/09/2026

#### Shell e arquitetura de informação
- navegação lateral persistente;
- separação entre **Dinâmicas** e **Ferramentas**;
- remoção das tabs superiores antigas da Arena;
- header de sessão com estado ao vivo, tempo, Projetor e encerramento;
- workspace central em largura ampliada;
- rail contextual com participantes, busca, presença e código da sessão;
- cópia do código da sessão;
- status diferenciado entre online, presente offline e ausente.

#### Ferramentas transversais
- Timer em drawer contextual;
- Organização da turma em drawer contextual;
- Presença e acesso em drawer contextual;
- Pontuação rápida transversal;
- QR e fluxo de acesso ajustados para o contexto do drawer.
#### Sorteio Inteligente 2.0
- backend continua sendo a única autoridade da seleção;
- frontend apenas apresenta o resultado;
- regras reais expostas em Configurações:
  - Balanceado;
  - Apenas presentes;
  - Evita repetição imediata;
- histórico recente de sorteios;
- cobertura da rodada;
- barra do aluno selecionado;
- integração com Pontuação Rápida;
- geometria da roleta migrada de CSS posicional para **SVG**;
- semianel segmentado;
- segmentos reais por participante/slot;
- modo estático para conjuntos pequenos;
- modo carrossel para turmas maiores;
- quantidade de slots visíveis adaptada à largura do componente com preferência por contagem ímpar;
- marcador triangular fixo reintroduzido como referência espacial, sem participar da autoridade do resultado;
- participante vencedor assentado no slot central fixo;
- slot neutro no estado parado para evitar duplicidade visual em turmas pares pequenas;
- aceleração, velocidade sustentada e desaceleração progressiva durante o sorteio;
- pulse curto de confirmação após o assentamento;
- reduced motion preservado.

### Fechamento do incremento

O `16.0` está concluído na branch de execução. Os últimos gates foram fechados em:
- `16.0F.18` — quality gate técnico, responsividade, acessibilidade e limpeza do CSS legado;
- `16.0F.19` — consistência visual e vocabulário de estados entre as dinâmicas;
- `16.0F.20` — consistência do Projetor e recuperação após falha inicial do snapshot público.

Não há implementação funcional pendente para o `16.0`; o incremento foi integrado à `main` pelo PR #21.

### Gates já preservados
- XP continua baseado em `ScoreEvent`;
- seleção do Sorteio permanece server-authoritative;
- presença e runtime permanecem no backend;
- Projetor não ganha autoridade de domínio;
- ferramentas contextuais não substituem estado persistente;
- frontend não escolhe vencedor com `Math.random()`.

### Validação corrente

Última validação da branch:

```text
frontend
npm test       248 passed
npm typecheck  OK
npm build      OK
Docker frontend OK
```

## Critério de fechamento do 16.0

Critérios atendidos:
- todas as dinâmicas principais ocupam a mesma shell;
- Sorteio atingiu o gate visual aprovado;
- Timer, Organização, Presença e Pontuação funcionam sem navegação de página;
- responsividade desktop/tablet validada;
- acessibilidade, foco e reduced motion preservados;
- testes, typecheck, build e Docker verdes;
- nenhuma regra de domínio foi movida para o frontend.

## Fora do 16.0

Não entram nesta etapa:
- Journey;
- Mastery;
- achievements persistentes;
- nova economia de XP;
- novos modos de sorteio sem suporte do backend;
- redesign estrutural do Projetor;
- Student Experience.

Esses itens permanecem nos incrementos posteriores da v0.8.

## 16.1 — Journey Core

### Objetivo

Criar a fonte de verdade persistente da progressão pedagógica antes da experiência visual final do aluno.

### Implementado nesta primeira fatia

- migration `V28__journey_core.sql`;
- entidades `Journey`, `JourneyStage` e `JourneyStageProgress`;
- lifecycle `DRAFT → PUBLISHED → ARCHIVED`;
- desbloqueio `IMMEDIATE` e `PREVIOUS_STAGE_COMPLETED`;
- conclusão `MANUAL`, `ACTIVITY_SUBMITTED` e `ACTIVITY_GRADED`;
- conclusão por atividade derivada de `ActivitySubmission`, sem duplicar estado;
- progresso calculado por matrícula com estados `LOCKED`, `AVAILABLE`, `IN_PROGRESS` e `COMPLETED`;
- estrutura da jornada protegida após publicação;
- API administrativa e de progresso inicial;
- nova aba **Jornadas** na turma;
- editor mínimo do professor para ordenar etapas, vincular atividades, publicar e arquivar;
- smoke test real de criação/publicação concluído no ambiente Docker.

### Gates atuais

```text
backend tests               88 passed
JourneyCoreIT               OK
SecurityAndMigrationIT      OK
Flyway                      V1–V28 OK
frontend tests              253 passed
frontend typecheck          OK
frontend build              OK
Docker backend/frontend     OK
```

### Próximas fatias do 16.1

- endpoint público autenticado por participante para leitura da jornada publicada da própria turma — concluído;
- contrato explícito para a etapa atual e próxima ação do aluno — concluído;
- timestamp de conclusão derivada de atividade quando disponível — concluído;
- testes de autorização do contrato público — cobertura unitária adicionada; testes HTTP completos do `JourneyController` ainda pendentes;
- refinamento do editor de jornada publicado para modo de leitura mais compacto — concluído;
- fechamento documental do incremento antes do `16.2`.

## 16.2 — Learning Resources & Content Ingestion

### Objetivo

Permitir que a jornada represente conteúdo real e que o professor comece pelo fluxo que já possui — ou por nenhum material — sem tornar Markdown, Notion ou outra ferramenta uma dependência conceitual do produto.

### Primeira fatia implementada

- `LearningResource` e migration V29;
- `JourneySection` e migration V30;
- tipos `CONTENT`, `ACTIVITY`, `QUIZ`, `CHALLENGE`, `CHECKPOINT` e `EXTERNAL_RESOURCE`;
- wizard **Nova jornada** com quatro entradas: IA, modelo, importar material e em branco, mantendo fontes específicas fora do modelo mental principal;
- modelos pedagógicos iniciais: sequência, projeto integrador, preparação para avaliação e desafios;
- parser heurístico de texto;
- parser estrutural de Markdown;
- upload/drag-and-drop de PDF, DOC/DOCX, PPT/PPTX, Markdown e TXT até 20 MB via Apache Tika;
- links externos preservados como referências; URLs do Notion são reconhecidas automaticamente dentro do mesmo fluxo, sem scraping;
- IA configurável no backend para gerar apenas `DraftView`;
- prévia editável antes da criação persistente;
- prévia permite adicionar, remover e reordenar módulos/itens e revisar corpo/instruções/URL antes da materialização;
- materialização sempre cria jornada em rascunho;
- Journey Builder V2 organiza autoria por módulos e itens tipados;
- alternância **Estrutura / Visualizar como aluno** com prévia em capítulos e nós;
- edição administrativa preserva `JourneySection`, tipo do item e `LearningResource` no backend.

### Princípio de mercado

O fluxo não pressupõe que o professor mantenha um segundo cérebro, Markdown ou Notion. Essas fontes são adaptadores opcionais. A experiência principal também atende quem possui apenas documentos Office/PDF, texto solto, um briefing ou nenhuma estrutura anterior.

### Gate de fechamento

- ingestão validada com binários reais de PDF, DOCX e PPTX;
- segmentação heurística de documentos sem headings implementada;
- API/CRUD de `LearningResource` fechada com cobertura HTTP e proteção contra exclusão de recurso em uso;
- preview estrutural consolidado como referência visual, sem antecipar estados reais do aluno;
- adapter autorizado para Notion permanece como evolução posterior e não bloqueia o Journey MVP.

Com esses gates atendidos, o próximo incremento é `16.3 — Journey Study Experience`, regido pelo ADR-0045. A Jornada passa a ser tratada como estudo sequencial de conteúdo, não como workflow de Atividades ou dinâmicas da Arena.

## 16.3 — Journey Study Experience

### Correção de direção

O `16.3` substitui a formulação genérica **Student Experience** por uma fronteira explícita de produto:

> Jornada é um material de estudo estruturado, sequencial e acompanhável, organizado em módulos/capítulos e conteúdos.

A implementação seguirá [`INCREMENT_16_3.md`](INCREMENT_16_3.md) e [`ADR-0045`](adr/ADR-0045-jornada-e-estudo-sequencial-nao-workflow-de-atividades.md).

### Escopo central

```text
Journey
└── Module / Chapter
    └── Content
        └── Progress
```

- nova API de estudo independente de `/join`;
- rota `/learn`;
- visualização vertical de módulos e conteúdos;
- leitor de conteúdo;
- progresso e continuidade;
- professor consumindo a mesma experiência com capacidade extra de edição;
- simplificação posterior do Builder para módulos + conteúdos;
- ingestão/IA convergindo somente para conteúdo revisável.

### Limites

O incremento não transforma Journey em uma segunda área de Atividades e não incorpora Quiz, Votação, Buzzer, Boss Battle ou outras dinâmicas como tipos estruturais do percurso. Também não exige mapa ilustrado, skill tree ou branching para fechar o MVP.

### Sequência técnica

1. `16.3.0` Domain cleanup — **concluído**;
2. `16.3.1` Study API independente de `/join` — **concluído**;
3. `16.3.2` Study shell `/learn` — **concluído**;
4. `16.3.3` Journey Study View — **concluído**;
5. `16.3.4` Content Reader — **concluído**;
6. `16.3.5` Progressão e continuidade — **concluído**;
7. `16.3.6` mesma experiência para professor;
8. `16.3.7` simplificação do Builder;
9. `16.3.8` alinhamento de ingestão/IA.

## 16.4 — Journey Map

O incremento separado deixa de ser obrigatório no MVP. O mapa cognitivo será inicialmente a própria estrutura vertical de módulos e conteúdos do `16.3`. Qualquer visualização mais lúdica ou espacial passa a depender de evidência de uso após validação da experiência básica de estudo.
