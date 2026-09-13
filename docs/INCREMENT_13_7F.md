# 13.7F — Sessão, Dinâmicas e Theme Foundation

## Escopo

- remove o atalho `...` de encerramento da Home;
- exige confirmação para encerrar uma sessão dentro da Arena;
- renomeia `Presença` para `Participantes`;
- move `Boss Battle` para `Dinâmicas`;
- cria contrato semântico de cores para Claro/Escuro/Sistema.

## Boss Battle

Boss Battle é uma dinâmica coletiva. Na versão atual o professor define nome e HP, o runtime é sincronizado com participantes/Projetor e o dano é aplicado manualmente. Quiz e XP não causam dano automático.

## Participantes

O id interno `presence` é preservado. A interface passa a usar `Participantes` como ferramenta superior e presença/conexão como atributos dos participantes.

## Tema

`styles/theme.css` passa a ser a fonte única para cores sensíveis ao tema. `styles/tokens.css` expõe aliases `--ds-*`.

Nenhuma migration. Flyway permanece em V17.
