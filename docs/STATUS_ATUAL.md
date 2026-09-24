# Estado atual — Arena Dev

**Última sincronização documental:** 24 de setembro de 2026

**Baseline publicada:** `v0.7.0 — Educational Integrations`.

**Linha ativa:** `v0.8 — Professor Experience & Journey MVP`.

**Incremento em execução:** `16.0 — Professor Arena Experience`.

**Branch ativa:** `feat/v0.8-professor-arena-cockpit`.

## Estado resumido

A v0.7.0 está encerrada e publicada. A execução atual está concentrada na experiência do professor da v0.8.

O cockpit da Arena já migrou para uma arquitetura orientada por ações, com navegação lateral, workspace de dinâmica, ferramentas contextuais e rail persistente de participantes/sessão.

O Sorteio Inteligente 2.0 é a referência visual da nova shell e está funcional, com seleção autoritativa no backend, histórico, cobertura, pontuação rápida e roleta SVG adaptativa. A geometria visual final continua em refinamento e, portanto, o `16.0` ainda não está concluído.

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
- roleta SVG com segmentos reais;
- modo estático e carrossel para turmas maiores;
- slots adaptados à largura disponível;
- vencedor representado pelo estado do segmento, sem ponteiro como autoridade visual.

## Em refinamento

- fidelidade visual da roleta;
- proporção final do semianel;
- escala do hub `SORTEAR`;
- labels radiais;
- responsividade visual comparada à referência aprovada.

## Validação corrente

```text
frontend tests      228 passed
frontend typecheck  OK
frontend build      OK
```

## Próximo gate

Concluir o polish visual e responsivo do `16.0`, validar as demais dinâmicas na nova shell e somente então avançar para `16.1 — Journey Core`.

Detalhes:
- [`ROADMAP_0_8.md`](ROADMAP_0_8.md)
- [`INCREMENT_16_0.md`](INCREMENT_16_0.md)
