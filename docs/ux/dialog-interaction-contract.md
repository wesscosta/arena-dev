# ArenaDev — Contrato de modais, drawers e ações

**Escopo:** interface do professor, Arena ao vivo, Biblioteca e Jornadas. Este contrato não muda o domínio nem a lógica pedagógica.

## Elementos visuais compartilhados

- Cabeçalho: título contextual, descrição opcional e um único `DialogCloseButton` (X, 44 × 44 px) à direita.
- Nome acessível: `Fechar <contexto>`; o ícone visual fica oculto a leitores de tela.
- Conteúdo: rolável sem cortar título ou ações. Respeitar viewport mobile, zoom, `dvh` e safe areas quando aplicáveis.
- Rodapé: **apenas ações com finalidade distinta do X**, ordenadas da secundária para a primária. Botões têm no mínimo 44 px de altura, foco visível e texto compreensível.
- Confirmação de formulário: `Cancelar` pode coexistir com X para explicitar descarte (mesma saída técnica, significado de fluxo distinto); ação de efeito explícito com cor primária (`Salvar`, `Importar resultados`, `Adicionar snapshot`). Proteger operações em andamento.
- Consultas sem operação de confirmação: somente X; nada de “Fechar”, “Voltar à Arena” ou “Voltar à aula” duplicados no rodapé.
- Painéis com próxima ação pedagógica: X fecha; `Atualizar dados` é secundário e `Abrir verificação` é primário.
- Fluxos com várias etapas: `Voltar` retorna **à etapa anterior**, não fecha o modal. O X é o único fechamento contextual.
- Drawer de ferramenta mantém apresentação lateral no desktop/inferior no mobile. Timer em tela cheia usa “Minimizar”, não “Fechar”, pois preserva a contagem. Resultado Spotlight não pode ser dispensado sem resolver o sorteio.
- Tecla `Esc`, foco inicial/final e restituição do foco ao disparador devem ser verificados; falha de rede não deve silenciosamente descartar alterações ou duplicar pontuação.

## Aplicações desta rodada

| Fluxo | Fechamento | Rodapé / comportamento |
| --- | --- | --- |
| Painel pedagógico | X · Fechar painel pedagógico | Atualizar dados; Abrir verificação |
| Material na Arena | X · Fechar biblioteca | Sem retorno duplicado; seleção e desvinculação ocorrem no conteúdo |
| Sorteio — ajustes e demais drawers da Arena | X · Fechar ferramenta | Mudanças no conteúdo; não introduzir confirmação fictícia |
| Modais de cadastro/edição e importação externa | X contextual | Cancelar quando pertinente; ação de confirmação com verbo de efeito |
| Criação de turma — etapa concluída | X · Fechar nova turma | Somente `Abrir turma`; removido `Concluir por enquanto`, que repetia a mesma navegação |
| Criar Jornada | X · Fechar criação de jornada | Voltar navega entre etapas; não significa fechar |
| Seletor da Biblioteca na Jornada | X · Fechar biblioteca | Selecionar material no conteúdo |
| Reutilizar recurso da Biblioteca | X · Fechar reutilização de material | Cancelar e Adicionar snapshot (formulário) |
| QR Code da sessão | X · Fechar QR Code ampliado | Sem ações redundantes |
| Atividade do estudante (modo focado) | X · Fechar atividade | Navegação Anterior/Próxima e envio permanecem no rodapé |

**Exceções deliberadas:** fluxo Spotlight de sorteio, timer em modo foco e páginas de gerenciamento não são modais comuns. Não impor X quando isso permitiria descartar uma operação que exige reconciliação.

## Homologação

Executar E2E em viewports 320, 390, 430, 768 px; comparar retângulos do X, hierarquia das ações, sobreposição e fechamento por `Esc`. Complementar com Safari real no iPhone, VoiceOver e navegação por teclado antes de aceitar a v0.10.
