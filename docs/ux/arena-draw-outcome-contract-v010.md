# Sorteio — decisão pedagógica e contrato do Spotlight (v0.10)

## Problema

O modal anterior apresentava quatro botões com hierarquia semelhante e duas formas concorrentes de confirmar: `Confirmar participação` e `Confirmar e pontuar`. A seleção já ocorreu quando o modal aparece; a tarefa do professor nesse momento não é escolher um comando técnico, mas **registrar o desfecho da chamada**. Além disso, `Vezes chamado: 0` no próprio momento da seleção competia com o histórico da sessão e podia parecer contraditório.

## Decisão de interface

1. Identificar com clareza o participante (nome de exibição e nome completo apenas se diferentes).
2. A opção `Conceder XP` começa desmarcada. Ao ativá-la, aparece um campo numérico de 1 a 100, pré-preenchido com 5 mas **sem concessão automática**. O professor decide explicitamente.
3. **Uma única ação principal**, cujo rótulo reflete o efeito: `Confirmar sem XP` ou `Confirmar +N XP`. Ao confirmar, a interface envia `CONFIRMED` com `score=null` ou com o `score` existente. O backend mantém auditabilidade e idempotência.
4. **Outras duas ações**, de menor destaque e acompanhadas de explicações:
   - `Passar a vez` → `PASSED`: registra a chamada como consumida para a rodada, sem XP.
   - `Anular sorteio` → `VOIDED`: cancela a chamada inválida, reabrindo sua elegibilidade na rodada, sem XP.
5. O modal não repete a contagem de chamadas nem uma mensagem longa explicando que o sorteio não pontua: o controle de XP já comunica isso.
6. O layout mobile mantém todas as decisões operáveis em um cartão com rolagem interna, portaled ao `body`, posicionamento fixo e altura delimitada por viewport/safe areas. O conteúdo de fundo permanece inacessível ao teclado enquanto existe um resultado pendente. Não existe botão de fechar modal: primeiro é obrigatório registrar um dos três desfechos, preservando a semântica do domínio.

## Regras de segurança e continuidade

- Nenhum ponto é concedido por sorteio, por `PASSED` ou por `VOIDED`; somente `CONFIRMED` pode carregar XP (categoria `COLLABORATION`, motivo `Participação` nos contratos existentes).
- Campo inválido não permite confirmar com XP. Ao desmarcar `Conceder XP`, nenhum valor é enviado mesmo que o professor tenha digitado anteriormente.
- Preservar a proteção de duplo clique e a reconciliação GET quando o comando HTTP pode ter sido registrado no servidor sem confirmação no navegador. Não refazer comandos incertos.
- Manter foco no cartão ao sortear, foco preso entre os controles enquanto o desfecho está pendente e retorno ao botão de sorteio após a resolução.

## Testes e limites

- E2E: confirmação com e sem XP, campo inválido, passagem e anulação, segunda rodada, contagem de ScoreEvents, duplicação em falha HTTP, foco de teclado e viewport de 320 x 568 px.
- Screenshot em 320 px e desktop para validar contraste/hierarquia; Chromium automatizado não substitui validação Safari/VoiceOver no iPhone físico.
- A decisão de usar pontuação opcional não implica que o professor deva premiar participação: o indicador pedagógico deve orientar critérios transparentes de XP.
