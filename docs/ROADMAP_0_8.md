# Roadmap v0.8 — Professor Experience & Journey MVP

**Linha ativa:** v0.8  
**Branch de execução:** `feat/v0.8-professor-arena-cockpit`  
**Estado atual:** `16.0 — Professor Arena Experience` concluído na branch e aguardando PR.

A v0.8 valida duas experiências distintas sobre o mesmo domínio:

- **Professor / Ao Vivo:** cockpit operacional para condução da aula;
- **Aluno / Jornada:** progressão persistente, missões, evidências e domínio.

A versão não busca ampliar escopo indiscriminadamente. O foco é validar valor de produto antes de avançar para Journey, Mastery e gamificação persistente.

## Sequência oficial

| Incremento | Objetivo | Estado |
| --- | --- | --- |
| 16.0 | Professor Arena Experience | **Concluído na branch · aguardando PR** |
| 16.1 | Journey Core | **Próximo** |
| 16.2 | Learning Resources básico | Planejado |
| 16.3 | Student Experience | Planejado |
| 16.4 | Journey Map | Planejado |
| 16.5 | Question Attempts & Skills | Planejado |
| 16.6 | Mastery básico | Planejado |
| 16.7 | Review | Planejado |
| 16.8 | Teacher Journey Dashboard | Planejado |
| 16.9 | Minimal Gamification | Planejado |
| 16.10 | Pilot, Metrics & Hardening | Planejado |
## 16.0 — Professor Arena Experience

### Objetivo

Transformar a Arena em um cockpit desktop de aula ao vivo orientado por ações, eliminando a navegação por abas conceituais.

### Implementado até 26/09/2026

#### Shell e arquitetura de informação
- navegação lateral persistente;
- separação entre **Dinâmicas** e **Ferramentas**;
- remoção das tabs superiores antigas da Arena;
- header de sessão com estado ao vivo, tempo, Projetor e encerramento;
- workspace central em largura ampliada;
- rail contextual com participantes, busca, presença e código da sessão;
- cópia do código da sessão;
- status diferenciado entre online, presente offline e ausente.

#### Ferramentas transversais
- Timer em drawer contextual;
- Organização da turma em drawer contextual;
- Presença e acesso em drawer contextual;
- Pontuação rápida transversal;
- QR e fluxo de acesso ajustados para o contexto do drawer.
#### Sorteio Inteligente 2.0
- backend continua sendo a única autoridade da seleção;
- frontend apenas apresenta o resultado;
- regras reais expostas em Configurações:
  - Balanceado;
  - Apenas presentes;
  - Evita repetição imediata;
- histórico recente de sorteios;
- cobertura da rodada;
- barra do aluno selecionado;
- integração com Pontuação Rápida;
- geometria da roleta migrada de CSS posicional para **SVG**;
- semianel segmentado;
- segmentos reais por participante/slot;
- modo estático para conjuntos pequenos;
- modo carrossel para turmas maiores;
- quantidade de slots visíveis adaptada à largura do componente com preferência por contagem ímpar;
- marcador triangular fixo reintroduzido como referência espacial, sem participar da autoridade do resultado;
- participante vencedor assentado no slot central fixo;
- slot neutro no estado parado para evitar duplicidade visual em turmas pares pequenas;
- aceleração, velocidade sustentada e desaceleração progressiva durante o sorteio;
- pulse curto de confirmação após o assentamento;
- reduced motion preservado.

### Fechamento do incremento

O `16.0` está concluído na branch de execução. Os últimos gates foram fechados em:
- `16.0F.18` — quality gate técnico, responsividade, acessibilidade e limpeza do CSS legado;
- `16.0F.19` — consistência visual e vocabulário de estados entre as dinâmicas;
- `16.0F.20` — consistência do Projetor e recuperação após falha inicial do snapshot público.

Não há implementação funcional pendente para o `16.0`; resta apenas integrar a branch por PR antes de abrir o `16.1`.

### Gates já preservados
- XP continua baseado em `ScoreEvent`;
- seleção do Sorteio permanece server-authoritative;
- presença e runtime permanecem no backend;
- Projetor não ganha autoridade de domínio;
- ferramentas contextuais não substituem estado persistente;
- frontend não escolhe vencedor com `Math.random()`.

### Validação corrente

Última validação da branch:

```text
frontend
npm test       248 passed
npm typecheck  OK
npm build      OK
Docker frontend OK
```

## Critério de fechamento do 16.0

Critérios atendidos:
- todas as dinâmicas principais ocupam a mesma shell;
- Sorteio atingiu o gate visual aprovado;
- Timer, Organização, Presença e Pontuação funcionam sem navegação de página;
- responsividade desktop/tablet validada;
- acessibilidade, foco e reduced motion preservados;
- testes, typecheck, build e Docker verdes;
- nenhuma regra de domínio foi movida para o frontend.

## Fora do 16.0

Não entram nesta etapa:
- Journey;
- Mastery;
- achievements persistentes;
- nova economia de XP;
- novos modos de sorteio sem suporte do backend;
- redesign estrutural do Projetor;
- Student Experience.

Esses itens permanecem nos incrementos posteriores da v0.8.
