# Incremento 16.0 — Professor Arena Experience

## Status

**Concluído e integrado à `main` pelo PR #21.** Ajustes transversais posteriores continuam entrando pelo Gate de Estabilização Arquitetural v0.8 sem reabrir a autoridade de domínio do 16.0.

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

Timer, Organização e Presença são ferramentas contextuais e não devem substituir a dinâmica aberta. O Timer foi posteriormente consolidado em uma única superfície de configuração, com presets em linha única sem scroll horizontal, Exibição/Alertas compactados e operação integral validada em 1366×768.

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

A estrutura funcional está consolidada e os passes de fidelidade `16.0F.5` a `16.0F.18` aproximaram a Arena da referência aprovada sem alterar a autoridade do backend.

Implementado neste passe:
- topbar operacional única durante a sessão ao vivo;
- contexto `Turmas > Turma > Sessão` e estado `AO VIVO` no header;
- sidebar simplificada: o retorno redundante `Voltar para a turma` foi removido e o contexto `Arena — Conduza sua aula ao vivo` passa a abrir a navegação;
- ícones SVG internos consistentes para dinâmicas e ferramentas;
- cockpit com proporções desktop reajustadas;
- roleta baseada em circunferência real, sem raios X/Y independentes;
- raio externo ampliado para `512` (~7% sobre o raio horizontal anterior) e interno para `327` (~15%);
- palco horizontal ampliado sem aumentar a altura útil da roleta;
- quantidade de casas calculada pela largura medida, comprimento do arco médio e total de participantes;
- mínimo visual de aproximadamente `150 px` de arco por casa, com capacidade adaptativa de até 9 slots;
- capacidade par é reduzida em uma casa quando necessário para preservar uma casa real exatamente sob o marcador fixo;
- badges auxiliares de quantidade de casas e participantes removidos da roleta;
- marcador triangular superior reintroduzido como referência visual fixa;
- destaque da casa de seleção preso ao slot central sob o marcador, enquanto os participantes circulam por essa posição;
- histórico permanente removido e incorporado à barra do sorteado por meio de um popover sem deslocamento de layout;
- HUD do sorteio reorganizado em duas zonas: resultado/CTA à esquerda e cobertura/histórico à direita;
- bloco de cobertura ocupa aproximadamente um terço da faixa, com `sorteados/total`, percentual em mini donut independente e `já sorteados` como acionador do histórico;
- o histórico fica integrado ao próprio bloco de cobertura, sem consumir uma coluna isolada;
- turmas pequenas também percorrem os slots durante o sorteio: a animação deixa de depender exclusivamente do modo carousel;
- marcador e casa de seleção permanecem fixos, enquanto os participantes percorrem os slots em três momentos perceptivos: aceleração curta, velocidade sustentada e desaceleração progressiva antes do assentamento final;
- após o backend definir o vencedor, a interface mantém ~850 ms de giro rápido, revela o vencedor para iniciar ~950 ms de desaceleração e só então encerra o estado de sorteio; `prefers-reduced-motion` continua usando caminho reduzido;
- ao encerrar a animação, a casa vencedora executa um pulse curto (~460 ms) para confirmar visualmente o resultado sem transformar a dinâmica em uma estética de cassino;
- em turmas pares pequenas, o slot extra usado para preservar uma casa central deixa de duplicar participantes no estado parado e vira um slot neutro (`◇`); durante a animação a circulação continua circular;
- rail de participantes passa a abrir em `Presentes` por padrão e oferece alternância explícita `Presentes | Todos`, reduzindo ruído durante a condução ao vivo;
- seletor de aluno em `Ações rápidas` passa a incorporar avatar/inicial e tratamento de chip contextual, enquanto `Outra pontuação` vira `Personalizar` com peso visual secundário;
- `Arena` na sidebar passa a funcionar como contexto visual mais silencioso e `Sorteio` concentra o estado ativo forte;
- ação `Configurações` do Sorteio foi compactada para `Ajustes`, e o espaçamento título→roleta foi reduzido para recuperar área útil sem alterar a geometria circular;
- drawers contextuais deixaram de fechar em eventos de `mousedown` do backdrop: agora só fecham por clique real fora do drawer, botão `×` ou `Esc`, evitando o fechamento indevido de selects nativos em `Organizar turma` e `Pontuação rápida`;
- QR da ferramenta `Presença e acesso` passou a reutilizar o mesmo modal ampliado da Arena, com affordance de zoom no próprio QR;
- no passe `16.0F.16`, o card de acesso foi simplificado: QR maior e sem moldura branca auxiliar/texto explicativo, URL com tipografia ampliada, subtítulo redundante removido e rotação de código movida para um botão circular discreto no cabeçalho do código;
- no passe `16.0F.17`, selects nativos da Arena e dos drawers receberam `color-scheme: dark` e estilos explícitos para campo/opções, eliminando o menu branco sem contraste no tema escuro;
- o indicador de usuários online saiu do card `Entrada dos alunos` e passou a aparecer ao lado do contador de presentes no cabeçalho da lista de participantes;
- `Nuvem de Palavras`, `Votação`, `Buzzer` e `Boss Battle` passaram a compartilhar um workspace de dinâmica com `height: 100%` em desktop, seguindo a mesma regra aplicada ao Quiz e retornando ao fluxo natural abaixo de `74rem`;
- workspace do Quiz passa a ocupar toda a altura disponível do cockpit em desktop (`100%` do `arena-cockpit-main`), mantendo fluxo natural abaixo de `74rem` para preservar responsividade;
- metadados do sorteado reduzidos a participação na sessão e XP para preservar foco operacional;
- `Ações rápidas` reorganizadas em contexto + seletor de aluno + cinco presets, com pontuação personalizada aberta sob demanda em popover;
- em desktop largo, pontuação rápida permanece em uma única faixa para evitar scroll da página principal;
- Arena desktop ocupando `100dvh`, com navegação e rail contextual esticados até o fim da tela;
- lista de participantes rolando internamente para manter código e QR visíveis;
- tipografia funcional elevada para os tokens mínimos do Design System;
- rail de participantes, resultado e pontuação rápida com densidade revisada;
- ação `Encerrar sessão` preservada também nos breakpoints compactos;
- no passe `16.0F.18`, foram removidas 141 regras CSS legadas da implementação anterior da roleta, reduzindo `arena-polish.css` em 832 linhas sem regressão funcional;
- drawers contextuais passaram a conter o foco via `Tab`/`Shift+Tab` e devolver o foco ao acionador ao fechar, preservando `Esc` e clique real no backdrop;
- Sorteio e rail de participantes ganharam estados vazios explícitos para sessões sem alunos presentes ou buscas sem resultado;
- o gate responsivo confirmou ausência de scroll da página principal em `1920×1080`, `1672×941`, `1440×900` e `1366×768` para Sorteio, Quiz, Votação, Nuvem de Palavras, Buzzer e Boss Battle; em `1024×768` o fluxo responsivo volta deliberadamente ao scroll natural.

O passe `16.0F.18` concluiu o quality gate técnico do cockpit. As seis dinâmicas principais foram validadas em `1920×1080`, `1672×941`, `1440×900` e `1366×768` sem scroll da página principal; em `1024×768`, a Arena mantém o fluxo responsivo natural. Os drawers preservam foco, `Esc`, clique externo e retorno ao acionador; `prefers-reduced-motion` continua reconhecido. A implementação legada da roleta foi removida de `arena-polish.css`, deixando o SVG atual como única geometria da roleta.

O passe `16.0F.19` consolidou a linguagem visual e de estado entre dinâmicas: Quiz, Votação e Nuvem de Palavras compartilham `PREPARAR`, mesma escala de título e inset de 20 px; os estados ativos convergem para `AO VIVO`, leitura pós-interação para `RESULTADO` e término para `ENCERRADO`. Buzzer e Boss Battle usam o mesmo vocabulário no cabeçalho, preservando estados de domínio como `Crítico`, `Enfraquecido` e a ordem oficial do Buzzer dentro do conteúdo.

O passe `16.0F.20` levou o mesmo vocabulário para o Projetor e corrigiu a recuperação após falha inicial do snapshot público: o mesmo código de sessão pode ser reenviado para uma nova tentativa sem precisar alterar a URL ou recarregar manualmente a página. O smoke test controlado confirmou falha inicial, mensagem de erro e recuperação posterior com o mesmo código.

## Validação técnica

Último gate executado na branch:

```text
248 testes frontend aprovados
npm run typecheck  OK
npm run build      OK
Docker frontend    OK
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
