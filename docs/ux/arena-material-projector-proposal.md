# Arena v0.10+ — proposta para apresentação sincronizada de materiais

**Natureza:** decisão de produto e escopo futuro; não está implementada. **Data:** 09/10/2026.

## Diagnóstico do código

- `ArenaContextualMaterial` vincula, busca e visualiza o recurso canônico da Biblioteca sem alterar o palco; não concede publicação ao aluno/projetor.
- `ProjectorView` consome snapshot público e eventos de `LiveStage` das dinâmicas; não tem modo `MATERIAL` ou ponteiro de navegação por seção.
- `LibraryContentViews.AnchoredMarkdown` já oferece Markdown com títulos ancorados. Os wrappers `<aside>` do export Notion passaram a ser tratados no renderer compartilhado, sem permitir HTML bruto.
- A experiência de Jornada e Biblioteca é referência de leitura, mas não se deve acoplar o progresso individual ou a navegação privada do professor à projeção pública.

## Opção recomendada — modo de apresentação explícito

1. Dentro do leitor de material, **Apresentar material** publica apenas o recurso explicitamente escolhido e muda o palco do projetor para **MATERIAL**. Vincular à sessão continua sendo uma ação diferente.
2. O projetor apresenta somente o conteúdo canônico renderizado (títulos, blocos, imagens autorizadas, callouts) em uma área de leitura otimizada, sem catálogo, campos de busca, metadados privados ou interface de gestão.
3. A navegação do professor por título/seção emite somente `anchorId`/identificador estrutural, não pixels de rolagem contínua. O projetor acompanha seções com atualização discreta; navegação manual e atualização automática podem ser separadas.
4. **Voltar às dinâmicas** restaura o modo de palco anterior, sem encerrar a sessão nem modificar tentativa, XP ou progresso.
5. A publicação é revogada no encerramento da sessão, na retirada do material e quando a origem não puder mais ser disponibilizada. Reconexão do projetor restaura modo/seção a partir de estado **autoritativo** do backend.

## Condições antes da implementação

- O endpoint público usado pelo projetor hoje aceita código de sessão. Expor material por esse caminho amplia o acesso à Biblioteca: exigir autorização explícita do professor, verificação de permissão/licença e limitar payload ao conteúdo publicado, nunca ao acervo inteiro.
- Validar conteúdo publicado e formato: Markdown e texto antes de links externos. A origem pode mudar; considerar pinagem da revisão publicada, indisponibilidade e expiração.
- Não transmitir HTML executável, tokens privados nem URLs autenticadas. Preservar a política de Markdown seguro.
- Separar o **estado público da projeção** do **estado de estudo individual** e do estado de edição. Não registrar visualização como aprendizagem.
- Evitar dois estados concorrentes (browser/localStorage e servidor) para a seção atual; servidores e espectadores devem reconstruir a visualização após reload e reconexão.
- Não reutilizar diretamente o zoom/scroll da tela do professor: densidade, legibilidade, leitores de tela e projetores têm necessidades distintas.

## Fases propostas

**A — MVP controlado:** modo MATERIAL e publicador explícito; renderização read-only do recurso; botão voltar às dinâmicas; autorização e testes de divulgação.

**B — Navegação sincronizada:** saltos de seção, preservação após reconexão e posicionamento acessível de foco e leitura; sem sincronização de scroll a cada pixel.

**C — Experimento pedagógico:** testar em aula se a projeção realmente substitui alternar abas/Canva, medindo esforço do professor e compreensão do conteúdo. Só depois expandir a outras visualizações.

### Não fazer agora

- Abrir publicamente todos os recursos vinculados à turma.
- Usar iframe genérico para documentos Notion/Canva sem política de origem e fallback.
- Reimplementar editor, acervo ou Jornada dentro da Arena.
- Sincronizar seleção, anotações privadas ou posição de rolagem do professor como fonte pública automática.
