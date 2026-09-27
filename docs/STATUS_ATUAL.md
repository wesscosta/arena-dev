# Estado atual — Arena Dev

**Última sincronização documental:** 26 de setembro de 2026

**Baseline publicada:** `v0.7.0 — Educational Integrations`.

**Linha ativa:** `v0.8 — Professor Experience & Journey MVP`.

**Incremento em execução:** `16.0 — Professor Arena Experience`.

**Branch ativa:** `feat/v0.8-professor-arena-cockpit`.

## Estado resumido

A v0.7.0 está encerrada e publicada. A execução atual está concentrada na experiência do professor da v0.8.

O cockpit da Arena já migrou para uma arquitetura orientada por ações, com navegação lateral, workspace de dinâmica, ferramentas contextuais e rail persistente de participantes/sessão.

O Sorteio Inteligente 2.0 é a referência visual da nova shell e está funcional, com seleção autoritativa no backend, marcador fixo, roleta SVG circular adaptativa, histórico, cobertura e pontuação rápida. O cockpit também consolidou filtros de participantes, QR ampliável, drawers estáveis e altura integral para Quiz, Votação, Nuvem de Palavras, Buzzer e Boss Battle. O quality gate técnico do `16.0` foi concluído no passe `16.0F.18`: responsividade desktop validada, CSS legado da roleta removido, estados vazios explícitos e drawers com contenção/retorno de foco. O incremento permanece aberto apenas para revisão visual final, smoke test controlado de erro de API, verificação do Projetor e fechamento documental/PR.

## Baselines

```text
baseline publicada        v0.7.0
linha ativa               v0.8
incremento atual          16.0
branch                    feat/v0.8-professor-arena-cockpit
schema                    Flyway V1–V27
provider operacional      Microsoft Teams
Google Classroom          standby
```

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

## Em refinamento

- revisão visual final entre todas as dinâmicas — concluída no `16.0F.19`;
- smoke test controlado de erro de API — Projetor validado em `16.0F.20`;
- revisão do Projetor com os novos estados da Arena — concluída no `16.0F.20`;
- fechamento documental e PR do `16.0`.

## Validação corrente

```text
frontend tests      248 passed
frontend typecheck  OK
frontend build      OK
frontend Docker     OK
```

## Próximo gate

Executar o fechamento documental e o PR do `16.0`. Os gates de revisão visual, erro controlado e Projetor foram concluídos nos passes `16.0F.19` e `16.0F.20`. Após o PR, iniciar `16.1 — Journey Core`.

Detalhes:
- [`ROADMAP_0_8.md`](ROADMAP_0_8.md)
- [`INCREMENT_16_0.md`](INCREMENT_16_0.md)
