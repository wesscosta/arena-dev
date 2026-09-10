# ADR-0031 — SessionEvent como linha do tempo operacional, não como runtime

**Status:** aceito  
**Data:** 09/09/2026

## Contexto

O Arena Dev já possuía histórico de XP por `ScoreEvent`, mas a aula passou a conter fatos importantes que não alteram pontuação: início/fim de sessão, navegação do roteiro, Poll, Nuvem, Buzzer, Timer, Sorteio, grupos e Boss Battle.

Usar logs técnicos ou reconstruir esse histórico consultando todos os domínios tornaria a experiência frágil e misturaria auditoria operacional com estado autoritativo.

Também seria inadequado transformar cada ação de participante em evento histórico, produzindo uma timeline ruidosa e duplicando dados já pertencentes a Poll, Word Cloud ou Buzzer.

## Decisão

Criar `SessionEvent` como **projeção cronológica persistente de fatos operacionais relevantes**.

```text
runtime/domínio autoritativo
        │
        │ fato semântico
        ▼
   SessionEvent
        │
        └── timeline somente leitura
```

`SessionEvent` armazena tipo, ator, resumo, payload de contexto, timestamp e sequência monotônica.

A sequência é globalmente monotônica e serve somente para ordenação determinística. Ela não representa quantidade de eventos de uma sessão e pode conter gaps.

## Fronteiras

### Continua fora de SessionEvent

- XP e reversão → `ScoreEvent`;
- votos → `PollVote`;
- palavras → `WordCloudSubmission`;
- ordem do Buzzer → `BuzzerPress`;
- estado atual do palco → `LiveStageState`;
- Timer atual → `SessionTimer`;
- passo preparado → `ActivityStep`.

### Não registrar como timeline

- heartbeat;
- reconnect;
- tick de Timer;
- cada voto/palavra/press;
- cada frame WebSocket;
- dano intermediário de Boss.

## Ator

O contrato inicial admite:

```text
TEACHER
SYSTEM
```

`SYSTEM` é usado quando o backend materializa um fato que não depende de comando explícito do professor, como expiração natural do Timer.

Não se cria identificação pessoal detalhada de operador enquanto o produto mantém um único contexto administrativo de professor.

## Consequências

### Positivas

- histórico pedagógico/operacional legível;
- ordenação estável sob operações próximas/concorrrentes;
- UI de histórico independente dos detalhes internos de cada runtime;
- preservação da responsabilidade de `ScoreEvent`;
- auditoria sem guardar respostas individuais em duplicidade;
- possibilidade futura de filtros/analytics sobre fatos sem reprocessar todos os domínios.

### Custos

- cada novo acontecimento relevante precisa ser instrumentado explicitamente;
- payload histórico exige disciplina para não virar estado paralelo;
- eventos já persistidos devem ser tratados como registro histórico e não reescritos para acompanhar mudanças futuras de UI.

## Regras

1. registrar fatos de alto nível, não telemetria técnica;
2. gravar o evento junto da transação do domínio sempre que possível;
3. não usar SessionEvent para reexecutar comandos;
4. não derivar ranking/XP de SessionEvent;
5. não permitir reversão de SessionEvent pela timeline;
6. novos tipos exigem semântica clara e utilidade histórica;
7. detalhes individuais permanecem nos domínios especializados.
