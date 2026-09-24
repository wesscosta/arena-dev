# Roadmap v0.8 — Professor Experience & Journey MVP

**Linha ativa:** v0.8  
**Branch de execução:** `feat/v0.8-professor-arena-cockpit`  
**Estado atual:** `16.0 — Professor Arena Experience` em execução.

A v0.8 valida duas experiências distintas sobre o mesmo domínio:

- **Professor / Ao Vivo:** cockpit operacional para condução da aula;
- **Aluno / Jornada:** progressão persistente, missões, evidências e domínio.

A versão não busca ampliar escopo indiscriminadamente. O foco é validar valor de produto antes de avançar para Journey, Mastery e gamificação persistente.

## Sequência oficial

| Incremento | Objetivo | Estado |
| --- | --- | --- |
| 16.0 | Professor Arena Experience | **Em execução** |
| 16.1 | Journey Core | Planejado |
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

### Implementado até 24/09/2026

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
- quantidade de slots visíveis adaptada à largura do componente;
- remoção do ponteiro triangular redundante;
- destaque do vencedor pelo próprio estado do segmento;
- reduced motion preservado.

### Em refinamento

A fidelidade visual do Sorteio ainda está em polish. Em especial:
- proporção final do arco externo;
- relação entre altura da roleta e largura útil;
- dimensão final do hub `SORTEAR`;
- rotação/legibilidade dos labels;
- validação visual em 1366, 1440 e 1920 px.
Esses ajustes são de apresentação. Não alteram a regra de sorteio nem a autoridade do backend.

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
npm test       228 passed
npm typecheck  OK
npm build      OK
```

## Critério de fechamento do 16.0
O incremento 16.0 só deve ser marcado como concluído quando:
- todas as dinâmicas principais ocuparem a mesma shell;
- Sorteio atingir o gate visual aprovado;
- Timer, Organização, Presença e Pontuação funcionarem sem navegação de página;
- responsividade desktop/tablet estiver validada;
- acessibilidade, focus e reduced motion permanecerem íntegros;
- testes, typecheck e build estiverem verdes;
- nenhuma regra de domínio tiver sido movida para o frontend.

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
