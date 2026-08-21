# ADR-0017 — Professor, aluno e projetor como três experiências do mesmo sistema

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** produto, UX, frontend

## Contexto

O Arena Dev precisa atender três situações de uso diferentes: o professor administra a aula, o aluno participa em interações habilitadas e o projetor exibe a experiência coletiva. Criar produtos/aplicações totalmente independentes aumentaria manutenção e poderia fragmentar o estado da sessão.

## Decisão

Tratar **Professor**, **Aluno** e **Projetor/Tela pública** como três experiências do mesmo Arena Dev e do mesmo contexto de sessão.

### Professor

Responsável por:

- selecionar turma;
- iniciar/encerrar sessão;
- presença;
- escolher e controlar dinâmicas;
- avaliar respostas;
- pontuar/corrigir;
- gerenciar atividades, ranking e histórico.

### Aluno

Experiência enxuta, orientada à sessão:

- entrar por código/QR;
- identificar-se conforme regra da sessão;
- usar Buzzer;
- responder/interagir quando a dinâmica permitir;
- receber informações individuais quando apropriado.

### Projetor/Tela pública

Experiência coletiva, sem controles administrativos sensíveis:

- código/QR da sessão;
- roleta/sorteio;
- questão/desafio;
- timer;
- Buzzer e ordem/resultados;
- placar/ranking quando o professor decidir exibir;
- Boss Battle e feedback visual.

As três visões compartilham a mesma `ClassSession`; não mantêm sessões de negócio independentes.

O frontend pode organizar essas experiências por layouts/rotas diferentes dentro da mesma aplicação Next.js.

## Consequências

### Positivas

- estado da aula permanece coerente;
- reduz duplicação de produto;
- permite UX adequada a cada dispositivo/uso;
- tela pública pode ser projetada sem expor controles do professor.

### Custos e riscos

- autorização/visibilidade precisa separar ações administrativas;
- responsividade e reconexão do aluno precisam ser tratadas cuidadosamente.

## Alternativas consideradas

### Três aplicações independentes

Rejeitada inicialmente por duplicação de manutenção e maior risco de divergência de sessão.

### Uma única tela idêntica para todos

Rejeitada porque professor, aluno e projetor têm responsabilidades e densidades de informação muito diferentes.

## Critérios de validação

- [ ] professor controla a sessão sem expor controles ao aluno;
- [ ] aluno entra na mesma sessão ativa por código/QR;
- [ ] projetor acompanha estado da sessão sem operar funções administrativas;
- [ ] ranking público pode ser ocultado pelo professor.

## Relações

- Relacionados: ADR-0004, ADR-0005, ADR-0006
