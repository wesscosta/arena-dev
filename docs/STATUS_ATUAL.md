# Estado atual — Arena Dev

**Última sincronização documental:** 26 de setembro de 2026

**Baseline publicada:** `v0.7.0 — Educational Integrations`.

**Linha ativa:** `v0.8 — Professor Experience & Journey MVP`.

**Incremento concluído na branch:** `16.0 — Professor Arena Experience`.

**Branch ativa:** `feat/v0.8-professor-arena-cockpit`.

## Estado resumido

A v0.7.0 está encerrada e publicada. A execução atual está concentrada na experiência do professor da v0.8.

O cockpit da Arena já migrou para uma arquitetura orientada por ações, com navegação lateral, workspace de dinâmica, ferramentas contextuais e rail persistente de participantes/sessão.

O Sorteio Inteligente 2.0 é a referência visual da nova shell e está funcional, com seleção autoritativa no backend, marcador fixo, roleta SVG circular adaptativa, histórico, cobertura e pontuação rápida. O cockpit também consolidou filtros de participantes, QR ampliável, drawers estáveis e altura integral para Quiz, Votação, Nuvem de Palavras, Buzzer e Boss Battle. Os passes `16.0F.18`, `16.0F.19` e `16.0F.20` fecharam respectivamente os gates técnico, de consistência visual e de Projetor/resiliência. Não há implementação funcional pendente no `16.0`; a branch aguarda apenas integração por PR.

## Baselines

```text
baseline publicada        v0.7.0
linha ativa               v0.8
incremento concluído      16.0
próximo incremento        16.1
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

Integrar `feat/v0.8-professor-arena-cockpit` por PR. Após o merge, abrir `16.1 — Journey Core` como próximo incremento da v0.8.

Detalhes:
- [`ROADMAP_0_8.md`](ROADMAP_0_8.md)
- [`INCREMENT_16_0.md`](INCREMENT_16_0.md)
