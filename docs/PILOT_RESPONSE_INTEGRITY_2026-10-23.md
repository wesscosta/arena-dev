# Piloto de atividades — integridade das respostas (23/10/2026)

## Origem

Problemas identificados durante uso real de Atividades. O fluxo anterior suprimia falhas em saveQuestion/saveGeneric e avançava para o envio após erro de persistência. A interface também renderizava o aviso de erro fora do runner em tela cheia.

## Correção

- A fila serializa gravações de alternativas para evitar retorno tardio sobrescrevendo resposta recente.
- IDs de itens são estáveis durante tentativa e retransmissão, inclusive após falha de rede.
- Ao avançar/fechar uma questão, o rascunho é reconciliado com a última cópia salva no servidor.
- Antes de enviar, todas as questões e a entrega complementar são confrontadas com o estado persistido. Falha em qualquer gravação interrompe o envio.
- O erro aparece dentro do runner, e o aluno pode tentar novamente sem perder o rascunho local.
- Os contratos das APIs e o modelo persistente permanecem inalterados.

## Testes automatizados e execução

- frontend/tests/submission-drafts.test.ts: ignora respostas já persistidas; grava novas respostas sequencialmente; interrompe ao falhar; permite reenvio após recuperação.
- npm test, npm run typecheck, ESLint, build Next.js via webpack. O build Turbopack exige dependências dentro do worktree: a ligação simbólica para node_modules da instalação local é recusada pelo próprio Turbopack e não demonstra defeito no código.
- Validação manual de navegador e cenários físicos permanece pendente; não confundir compilação com homologação.

## Cenários de aceite manual

1. Responder duas alternativas rapidamente e verificar que só a última é conservada.
2. Falhar uma gravação no servidor e tentar enviar; o envio deve ser bloqueado e o aviso visível dentro da atividade.
3. Restabelecer a rede e tentar novamente; os dados salvos devem corresponder às respostas escolhidas.
4. Digitar resposta discursiva, sair da questão e reabrir; o texto deve retornar.
5. Enviar atividade apenas com todas as respostas alteradas persistidas.
6. Confirmar regressão em ordenação individual das alternativas e critérios de autorização do participante.

## Fora de escopo deste PR

Autenticação verificada e logout, cronômetro pedagógico, acompanhamento em tempo real, redesign v0.12 e mudanças no backend. Esses itens seguem no plano canônico do Notion.
