# Navegação da Arena — contrato mobile (v0.10)

## Problema

Na Arena, todos os destinos (dinâmicas e ferramentas) disputavam o espaço entre marca e perfil, reduzidos a ícones sem rótulos. Na turma, já havia navegação em segundo nível com rótulo e seleção visível. Isso prejudicava o reconhecimento, a descoberta de funcionalidades e a consistência do sistema.

## Decisão

- **Desktop:** manter a barra lateral de dinâmicas e ferramentas: aproveita o espaço horizontal, rótulos explícitos e acesso rápido.
- **Mobile (até 768 px):** cabeçalho em duas faixas, análogo ao contexto da turma, sem uniformizar indevidamente funcionalidades diferentes:
  - Primeira faixa: marca que retorna a Turmas, contexto `Arena · Ao vivo`, comando `Ferramentas` e perfil no extremo direito.
  - Segunda faixa: largura **inteira disponível** para as dinâmicas, com ícone **e texto**, roláveis **somente na horizontal**, com seleção visível.
  - Menu `Ferramentas`: **Roteiro da aula, Timer, Organizar turma, Presença, Ranking, Pontuação rápida**. Os comandos usam os mesmos handlers da navegação desktop (sem duplicar lógica).
- Menu do perfil separado das ferramentas de aula, opaco e fora do container que recorta as abas.
- Sem toolbar inferior fixa: conflitaria com a barra do Safari, o teclado e a área usada para sorteio/interação.

## Regras de interação

- Cada dinâmica mantém seu nome acessível e `aria-current="page"` quando selecionada.
- A faixa das dinâmicas usa `overflow-x:auto`, `overflow-y:hidden`, `touch-action:pan-x`, altura definida e alvos de toque de pelo menos 44 px.
- Os botões de ferramentas e perfil ficam na primeira faixa, acessíveis sem rolagem; ferramentas não reduz a área das dinâmicas. `Esc` fecha o menu e devolve foco ao disparador. Toque externo também fecha.
- `Ferramentas` é ressaltado quando o roteiro ou uma ferramenta contextual está em uso.
- Alterar de dinâmica não altera dados persistidos, resultados de sorteio ou XP; abrir ferramenta contextual mantém a dinâmica subjacente.
- Nenhum item deve desaparecer: tudo que existia na navegação desktop continua acessível no mobile.

## Não fazer

- Não tratar todos os controles como ícones anônimos por falta de largura.
- Não colocar perfil, ferramentas e dinâmicas dentro do mesmo `overflow-x`.
- Não criar um segundo modelo de comandos para o mobile.
- Não alterar a sidebar desktop para copiar a turma.

## Validação

Testes Playwright para 320, 375, 390, 430, 768 e 1440 px: alinhamento de marca e perfil, linhas distintas, ausência de overflow vertical na faixa, presença de texto, seleção de Quiz/Sorteio, abertura e fechamento de Roteiro e Timer, funcionamento e limites visíveis dos menus e ausência de duplicação da navegação desktop.

A aprovação E2E em Chromium não substitui homologação de gestos e VoiceOver no Safari iOS real.
