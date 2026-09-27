# Estado atual — Arena Dev

**Última sincronização documental:** 27 de setembro de 2026

**Baseline publicada:** `v0.7.0 — Educational Integrations`.

**Linha ativa:** `v0.8 — Professor Experience & Journey MVP`.

**Incremento em fechamento:** `16.2 — Learning Resources & Content Ingestion` concluído na branch; `16.3 — Student Experience` é o próximo incremento após merge.

**Branch ativa:** `feat/v0.8-content-ingestion`.

## Estado resumido

A v0.7.0 está encerrada e publicada. Os incrementos `16.0` e `16.1` foram integrados à `main`; o `16.2 — Learning Resources & Content Ingestion` concluiu seus gates técnicos na branch ativa e aguarda revisão/merge.

O cockpit da Arena já migrou para uma arquitetura orientada por ações, com navegação lateral, workspace de dinâmica, ferramentas contextuais e rail persistente de participantes/sessão.

O `16.0 — Professor Arena Experience` e o `16.1 — Journey Core` foram integrados à `main` pelos PRs #21 e #22. A branch ativa fecha o `16.2`, com conteúdo real, criação agnóstica à fonte, Journey Builder V2 e contrato completo de recursos.

## Baselines

```text
baseline publicada        v0.7.0
linha ativa               v0.8
último incremento          16.1 · mergeado no PR #22
incremento atual           16.2
branch                    feat/v0.8-content-ingestion
schema                    Flyway V1–V31
provider operacional      Microsoft Teams
Google Classroom          standby
```

## Journey Core — implementação atual

- Flyway V28 com `journeys`, `journey_stages` e `journey_stage_progress`;
- jornadas pertencem à turma e passam por `DRAFT`, `PUBLISHED` e `ARCHIVED`;
- etapas ordenadas podem vincular uma atividade existente;
- desbloqueio imediato ou dependente da etapa anterior;
- conclusão manual ou derivada de `ActivitySubmission`;
- progresso calculado por matrícula sem duplicar o estado das entregas;
- estrutura protegida após publicação;
- aba **Jornadas** e editor mínimo do professor implementados;
- criação e publicação validadas no ambiente Docker;
- leitura pública de jornadas publicada protegida por `X-Participant-Token`;
- contrato de progresso expõe etapa atual, próxima ação e timestamps de conclusão derivados das entregas;
- jornadas publicadas usam visualização compacta de leitura no painel do professor.

## Learning Resources & Content Ingestion — em execução

- `LearningResource` separado de `Activity`;
- módulos persistidos por `JourneySection`;
- itens de jornada tipados como conteúdo, atividade, quiz, desafio, checkpoint ou recurso externo;
- wizard **Nova jornada** com IA, modelos, importação e autoria em branco, sem exigir que o professor conheça Markdown/Notion;
- ingestão de texto e Markdown;
- upload de PDF, DOC/DOCX, PPT/PPTX, Markdown e TXT até 20 MB;
- links tratados como recurso externo; Notion é reconhecido automaticamente dentro do fluxo de links, sem scraping do HTML público;
- prévia editável antes da materialização, incluindo estrutura, tipo, corpo/instruções e URL de recursos externos;
- conteúdo de IA permanece rascunho até revisão explícita do professor;
- upload multipart validado no navegador com preservação correta do boundary HTTP;
- Journey Builder V2 com módulos visuais e itens tipados;
- visão **Estrutura / Visualizar como aluno** implementada;
- prévia estrutural por capítulos/nós validada em 1440×900 sem scroll global;
- persistência administrativa de módulo, tipo do item e recurso vinculável consolidada no Journey Core;
- segmentação heurística reconhece títulos Office/PDF e agrupa documentos longos sem headings;
- extração validada com arquivos binários reais PDF/DOCX/PPTX;
- CRUD HTTP completo de `LearningResource`, incluindo leitura individual e exclusão segura;
- recurso vinculado a jornada não pode ser excluído e retorna conflito HTTP.

## UX transversal — shell e participantes

- páginas administrativas voltaram a crescer conforme o conteúdo, com scroll natural do documento;
- confinamento `100dvh`/`overflow: hidden` ficou restrito à Arena ao vivo via `arena-fullscreen-shell`;
- scroll lock de overlays centralizado e seguro para locks simultâneos;
- tela de participantes simplificada com busca, nome de exibição sob demanda e ações por ícones;
- regressão validada com 258 testes de frontend e build de produção.

## Professor Arena Experience — implementado

- tabs antigas removidas da Arena;
- sidebar persistente por ação;
- Dinâmicas e Ferramentas separadas;
- header operacional de sessão;
- Arena full-width em desktop;
- rail de participantes e código de sessão;
- Timer, Organização e Presença como ferramentas contextuais;
- Pontuação Rápida transversal;
- Sorteio Inteligente com backend autoritativo;
- Configurações exibem apenas políticas reais;
- histórico e cobertura de sorteios;
- roleta SVG com segmentos reais e geometria circular preservada;
- marcador fixo sobre o slot vencedor, sem autoridade de domínio;
- carrossel adaptativo com slots ímpares e slot neutro para turmas pares pequenas;
- animação em aceleração, giro sustentado e desaceleração;
- rail com filtro Presentes/Todos;
- QR ampliável em Presença e acesso;
- indicadores de online e presença consolidados no roster;
- selects nativos com contraste dark consistente;
- Quiz, Votação, Nuvem de Palavras, Buzzer e Boss Battle em workspace de altura integral no desktop.

## Fechamentos anteriores

- `16.0` concluído e mergeado no PR #21;
- `16.1` concluído e mergeado no PR #22.

## Validação corrente

```text
backend unit        107 passed
backend integration 76 passed
backend total       183 passed
frontend tests      258 passed
frontend typecheck  OK
frontend build      OK
Flyway              V1–V31 OK
```

## Próximo gate

Revisar e integrar a branch do `16.2`. Após o merge, iniciar `16.3 — Student Experience`, conectando o mapa da jornada ao progresso real de cada aluno.

Detalhes:
- [`ROADMAP_0_8.md`](ROADMAP_0_8.md)
- [`INCREMENT_16_2.md`](INCREMENT_16_2.md)
- [`INCREMENT_16_1.md`](INCREMENT_16_1.md)
- [`INCREMENT_16_0.md`](INCREMENT_16_0.md)
