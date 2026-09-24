# Incremento 16.0 — Professor Arena Experience

## Status

**Em execução** na branch `feat/v0.8-professor-arena-cockpit`.

## Problema

A Arena anterior organizava a condução da aula por categorias internas do sistema. Durante uma aula ao vivo, o professor precisa operar por ações: sortear, abrir quiz, votar, usar timer, organizar a turma, conferir presença e pontuar.

## Decisão de UX

A Arena passa a funcionar como um **cockpit operacional** com quatro camadas:

1. contexto da sessão;
2. navegação lateral por ação;
3. workspace da dinâmica;
4. contexto persistente de participantes e sessão.

## Estrutura implementada

### Dinâmicas
- Sorteio;
- Quiz;
- Votação;
- Nuvem de Palavras;
- Buzzer;
- Boss Battle.
### Ferramentas
- Roteiro da aula;
- Timer;
- Organizar turma;
- Presença;
- Pontuação rápida.

Timer, Organização e Presença são ferramentas contextuais e não devem substituir a dinâmica aberta.

## Sorteio Inteligente

O Sorteio é a dinâmica de referência visual da nova Arena.

### Autoridade
- o backend escolhe o vencedor;
- o frontend não sorteia aluno;
- o resultado visual deriva do `studentId` retornado pelo backend.

### Política atual
O backend opera com:
- participantes presentes;
- balanceamento por frequência de sorteio;
- prevenção de repetição imediata quando há mais de um participante.

A interface não deve oferecer estratégias configuráveis que o backend ainda não implementa.
### Componente visual

A roleta foi isolada em:

```text
frontend/components/arena/draw/
├── DrawWheel.tsx
└── DrawWheel.module.css
```

O componente:
- usa SVG para a geometria;
- desenha segmentos reais;
- mantém centro vazado;
- integra o hub de ação;
- trabalha com modo estático e carrossel;
- adapta a quantidade de slots à largura disponível;
- posiciona o vencedor no slot central no modo carrossel;
- representa a seleção por cor/halo/estado do segmento;
- não usa ponteiro triangular para determinar o vencedor.

## Rail contextual

O rail da sessão mantém:
- participantes;
- busca;
- estado de presença/conexão;
- código de sessão;
- cópia do código;
- QR de entrada.
Sem evidência de conexão ativa, a UI não deve rotular um participante como online apenas por estar presente.

## Presença

A ferramenta de Presença usa drawer dedicado e variante compacta do cartão de acesso.

O drawer deve:
- preservar a dinâmica atual;
- exibir QR sem overflow;
- permitir copiar link/código;
- exibir participantes e presença;
- funcionar em desktop e mobile.

## Pontuação rápida

Pontuação permanece transversal ao contexto da dinâmica.

`ScoreEvent` continua como ledger autoritativo de XP.

## Responsividade

Prioridades:
- desktop-first para professor;
- tablet como first-class;
- mobile com operação básica.
O Sorteio e o cockpit devem ser validados pelo menos em:
- 1920×1080;
- 1440×900;
- 1366×768;
- 1024×768.

## Estado do polish

A estrutura funcional está consolidada, mas o Sorteio continua em ajuste de fidelidade visual em relação à referência aprovada.

Pendências visuais atuais:
- proporção final do semianel;
- altura do arco;
- escala do hub `SORTEAR`;
- orientação dos labels;
- comparação lado a lado com a referência em larguras de desktop.

## Validação técnica

Último gate executado na branch:

```text
228 testes frontend aprovados
npm run typecheck  OK
npm run build      OK
```
## Não objetivos

Este incremento não altera:
- algoritmo de XP;
- `ActivitySubmission`;
- integração Teams;
- Journey;
- Mastery;
- Review;
- regras do Projetor;
- autoridade do backend.
