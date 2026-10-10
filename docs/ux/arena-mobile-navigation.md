# Navegação da Arena — contrato de interface v0.10 (09/10/2026)

## Decisão vigente

A Arena mantém **uma fonte tipada de destinos** (`frontend/components/arena/live/arena-navigation.ts`) para desktop e mobile. Os eventos continuam sob responsabilidade de `ArenaApp`, de modo que mudar a apresentação da navegação não cria rotas paralelas nem altera sessão, sorteio, XP ou estágio ao vivo.

| Contexto | Apresentação | Critério |
|---|---|---|
| Desktop (> 768 px CSS) | Sidebar persistente com grupos e item atual destacado | Troca rápida de dinâmica sem mudar o palco |
| Mobile (até 768 px CSS) | Hambúrguer à direita abre drawer vertical de largura limitada | Recupera largura e remove a antiga faixa horizontal |

Ordem dos grupos: **Aula** (Material da aula, Roteiro), **Dinâmicas** (Sorteio, Quiz, Verificar aprendizagem, Votação, Nuvem, Buzzer, Boss Battle), **Ferramentas** (Presença e acesso, Timer, Organizar turma, Ranking, Pontuação rápida), **Acompanhamento** (Evidências da aprendizagem). No mobile o final do menu agrega Tempo de sessão, Configurações, Encerrar sessão da Arena e Sair da conta; o desktop mantém conta no perfil e encerramento no cabeçalho.

## Contrato operacional

- **Projetar** fica acessível diretamente à esquerda do hambúrguer na barra mobile e no cabeçalho operacional do desktop; apenas controla a janela de projeção, não publica materiais nem inicia dinâmicas. O plano de projeção de conteúdos está em [`arena-material-projector-proposal.md`](arena-material-projector-proposal.md).
- **Material da aula** é o vínculo professor–Biblioteca do contexto da sessão. **Não publica** conteúdo automaticamente a alunos/projetor. Há uma única instância do modal por sessão; trocar de dinâmica não deve duplicar seu estado.
- **Evidências da aprendizagem** substitui o nome genérico Painel pedagógico. Exibe respostas avaliadas, diagnósticos, intervenções e comparações; o menu de sugestões fixas `Próximas ações` foi retirado. Não se deve inferir recomendação personalizada sem evidência suficiente.
- **Presença e acesso** conserva participantes, código e QR ampliado; o painel redundante permanece oculto no mobile.
- **Encerrar sessão da Arena** não é o mesmo que **Sair da conta**; a confirmação de encerramento existente deve permanecer.
- O cabeçalho identifica somente a turma, sem breadcrumb/selo permanente de sessão ao vivo.

## Acessibilidade e responsividade

- O menu utiliza `aria-expanded`, `aria-controls`, região de diálogo durante a abertura, foco inicial, contenção de Tab/Shift+Tab, Escape e fechamento por toque externo; ao fechar, o foco volta ao hambúrguer, exceto quando um modal de destino assume o foco.
- Uma seleção fecha o drawer antes de executar o comando. O estado da dinâmica e o estado das ferramentas continuam independentes.
- Alvos de interação >= 44 px CSS; suporte a safe-area, rolagem interna vertical do drawer, travamento da rolagem de fundo, ausência de rolagem horizontal global.
- A classe `arena-nav-mobile-tools` e a antiga folha `arena-navigation-mobile.css` não fazem mais parte da composição. As regras definitivas ficam em `mobile-reflow.css`, carregadas após o CSS legado.

## Verificação e limitações

- Testes isolados de geometria Playwright: `e2e/arena-navigation-drawer.spec.ts` e `e2e/mobile-reflow.spec.ts`, cobrindo 320, 375, 390, 430, 768, 1024 e 1440 px CSS.
- Fluxos integrados: `e2e/arena-shell.spec.ts` e `e2e/critical-flows.spec.ts` devem ser executados contra frontend/backend com origens permitidas e credenciais E2E válidas.
- Chromium isolado **não é** homologação em Safari iOS/PWA. Validar fisicamente drawer aberto/fechado, rolagem, zoom, VoiceOver, retorno de foco, Material, Evidências, Presença, Projetor e encerramento.
- A antiga navegação em duas faixas está superada por esta decisão; não restaurar o menu `Ferramentas` separado nem as sugestões genéricas no cabeçalho.
