# Estado atual — Arena Dev

**Última sincronização documental:** 26 de setembro de 2026

**Baseline publicada:** `v0.7.0 — Educational Integrations`.

**Linha ativa:** `v0.8 — Professor Experience & Journey MVP`.

**Incremento ativo:** `16.1 — Journey Core`.

**Branch ativa:** `feat/v0.8-journey-core`.

## Estado resumido

A v0.7.0 está encerrada e publicada. O `16.0 — Professor Arena Experience` também foi integrado à `main`; a execução atual está concentrada no `16.1 — Journey Core`.

O cockpit da Arena já migrou para uma arquitetura orientada por ações, com navegação lateral, workspace de dinâmica, ferramentas contextuais e rail persistente de participantes/sessão.

O Sorteio Inteligente 2.0 é a referência visual da nova shell e está funcional, com seleção autoritativa no backend, marcador fixo, roleta SVG circular adaptativa, histórico, cobertura e pontuação rápida. O cockpit também consolidou filtros de participantes, QR ampliável, drawers estáveis e altura integral para Quiz, Votação, Nuvem de Palavras, Buzzer e Boss Battle. Os passes `16.0F.18`, `16.0F.19` e `16.0F.20` fecharam respectivamente os gates técnico, de consistência visual e de Projetor/resiliência. O `16.0` foi integrado à `main` pelo PR #21; a branch ativa agora é a do Journey Core.

## Baselines

```text
baseline publicada        v0.7.0
linha ativa               v0.8
último incremento          16.0 · mergeado no PR #21
incremento atual           16.1
branch                    feat/v0.8-journey-core
schema                    Flyway V1–V28
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
- criação e publicação validadas no ambiente Docker.

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

## Fechamento do 16.0

- quality gate técnico concluído em `16.0F.18`;
- consistência visual e estados concluídos em `16.0F.19`;
- Projetor e recuperação de falha concluídos em `16.0F.20`;
- documentação de fechamento concluída;
- pendência operacional: PR/merge da branch.

## Validação corrente

```text
frontend tests      248 passed
frontend typecheck  OK
frontend build      OK
frontend Docker     OK
```

## Próximo gate

Consolidar o `16.1 — Journey Core`: domínio, persistência, API e editor mínimo do professor antes de avançar para `16.2 — Learning Resources básico`.

Detalhes:
- [`ROADMAP_0_8.md`](ROADMAP_0_8.md)
- [`INCREMENT_16_0.md`](INCREMENT_16_0.md)
