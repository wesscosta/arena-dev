# ADR-0045 — Jornada é estudo sequencial, não workflow de atividades

**Status:** Aceito  
**Data:** 2026-09-27  
**Linha:** v0.8

## Contexto

O Journey Core (`16.1`) e o Content Ingestion (`16.2`) introduziram infraestrutura suficiente para jornadas persistentes, módulos, recursos de aprendizagem, progresso e ingestão de materiais. Durante a evolução do Journey Builder, porém, a experiência começou a expor tipos como atividade, quiz, desafio e checkpoint como elementos equivalentes da Jornada.

Essa direção cria sobreposição com domínios já existentes:

- **Atividades** já modela trabalho avaliativo/prático e entregas;
- **Arena / Ao Vivo** já modela Quiz, Votação, Buzzer, Nuvem de Palavras e outras dinâmicas síncronas;
- **Jornada** precisa resolver outra necessidade: estudo sequencial e persistente de conteúdo.

A referência visual analisada reforça que o valor central da Jornada é orientação cognitiva — saber onde estou, o que já estudei, o que vem depois e continuar de onde parei — e não construir mais um workflow de atividades.

## Decisão

A Jornada passa a ter a seguinte definição de produto:

> **Jornada é um material de estudo estruturado, sequencial e acompanhável, organizado em módulos/capítulos e conteúdos.**

A experiência principal expõe somente quatro conceitos:

```text
Journey
└── Module / Chapter
    └── Content
        └── Progress
```

A implementação existente permanece como infraestrutura de compatibilidade:

```text
Journey           → Journey
JourneySection    → Module
JourneyStage      → posição/progresso do conteúdo
LearningResource  → Content
```

`JourneyItemType`, `JourneyUnlockRule`, `JourneyCompletionRule`, `activityId` e outros detalhes não são eliminados imediatamente do schema, mas deixam de definir a experiência padrão do professor e do aluno.

## Fronteiras de produto

### Jornada

Responde: **“O que vou estudar e onde estou nesse percurso?”**

- módulos/capítulos;
- conteúdos sequenciais;
- leitura e estudo;
- progresso persistente;
- continuar de onde parou;
- ingestão de materiais;
- autoria e edição de conteúdo.

### Atividades

Responde: **“O que preciso fazer ou entregar?”**

- exercícios;
- projetos;
- questionários avaliativos;
- submissões;
- feedback;
- nota/avaliação.

Uma Jornada pode futuramente apontar para uma Atividade como recomendação complementar, mas não incorpora o domínio de Atividades.

### Arena / Ao Vivo

Responde: **“O que está acontecendo na aula agora?”**

- sorteio;
- quiz ao vivo;
- votação;
- nuvem de palavras;
- buzzer;
- organização da turma;
- presença;
- ferramentas de condução.

Essas dinâmicas não são tipos nativos de conteúdo da Jornada.

## Regras do MVP

- a progressão padrão é sequencial;
- conteúdo é concluído explicitamente pelo estudante;
- regras de desbloqueio por item não aparecem no editor comum;
- `itemType = CONTENT`, `completionRule = MANUAL` e desbloqueio derivado da posição são defaults internos para todo conteúdo novo;
- todo conteúdo novo da Jornada possui `LearningResource`; `JourneyStage` organiza posição/progresso e referencia o recurso, mas não é o repositório primário do material;
- professor e aluno usam a mesma experiência de leitura;
- professor recebe capacidades extras de edição, não uma tela de consumo diferente;
- Jornada funciona sem sessão ativa e não depende de `/join`;
- materiais importados ou gerados por IA sempre viram rascunho revisável;
- o mapa cognitivo da jornada será a própria estrutura vertical de módulos e conteúdos; não há requisito de skill tree ou mapa ornamental separado.

## O que a Jornada não deve fazer

- não duplicar Atividades;
- não duplicar dinâmicas da Arena;
- não expor workflow configurável como modelo mental principal;
- não obrigar configuração individual de unlock/completion;
- não exigir código de sessão para estudo assíncrono;
- não usar card dentro de card como mecanismo primário de hierarquia;
- não manter um “preview do aluno” diferente da experiência real de estudo;
- não transformar gamificação em estrutura do conteúdo.

## Consequências técnicas

### Backend

Criar uma camada de consumo separada da autoria:

```text
JourneyService       → administração/autoria
JourneyStudyService  → estudo/progresso
```

O contrato canônico de estudo será independente de `/api/join/{code}`.

A camada de estudo recebe uma identidade semântica própria (`StudyPrincipal`: usuário/matrícula/turma/papel), desacoplada de `SessionParticipant` e de detalhes HTTP. O `/join` pode atuar apenas como adapter temporário durante desenvolvimento; a release para aluno exige identidade persistente.

### Frontend

Criar uma área persistente de estudo em `/learn`, com componentes compartilhados por professor e aluno.

A autoria será simplificada para módulos + conteúdos. Detalhes internos do Journey Core permanecem encapsulados.

### Identidade

O progresso real do aluno continuará ligado a `Enrollment`. O professor poderá consumir a mesma interface, mas seu progresso pessoal não será persistido no MVP enquanto não existir identidade persistente adequada para esse papel.

Não será criada matrícula falsa para professor.

## Alternativas rejeitadas

### Manter Jornada como sequência de tipos heterogêneos

Rejeitada porque duplica responsabilidades de Atividades e Arena, aumenta carga cognitiva e transforma Journey em um segundo workflow operacional.

### Usar `/join` como acesso principal à Jornada

Rejeitada porque sessão e participant token são temporários, enquanto estudo precisa continuar fora da aula e em outro momento.

### Criar um mapa gamificado separado como requisito obrigatório

Rejeitada no MVP. A hierarquia vertical de módulos e conteúdos já fornece orientação suficiente, com menor custo de acessibilidade, responsividade e manutenção.

## Relação com incrementos

- `16.1` permanece como infraestrutura de progressão;
- `16.2` permanece como infraestrutura de conteúdo/ingestão;
- `16.3` é redefinido como **Journey Study Experience**;
- o antigo candidato `16.4 — Journey Map` deixa de ser incremento obrigatório e é absorvido pelo `16.3` como linguagem de progressão vertical; qualquer visualização mais lúdica passa a ser evolução posterior baseada em evidência de uso. O identificador `16.4` foi posteriormente reutilizado pelo roadmap corrente para **Student Experience Shell & Workspace Visibility**, sem alterar esta decisão arquitetural sobre Journey Map.
