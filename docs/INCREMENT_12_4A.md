# Incremento 12.4A — ActivityStep e fundação de autoria do Roteiro ao Vivo

## Objetivo

Criar a camada de **autoria ordenada** do Roteiro ao Vivo sem introduzir ainda
estado de execução em `ClassSession`.

A separação é deliberada:

```text
Activity
└── ActivityStep[]          = template / preparação

ClassSession
└── runtime da aula         = execução futura
```

`ActivityStep` não registra votos, submissões, presença, Timer ou qualquer
estado efetivamente ocorrido em aula.

## Tipos iniciais

- `SLIDE`
- `QUESTION`
- `WORD_CLOUD`
- `POLL`

O Timer permanece transversal e não é um step obrigatório.

## Persistência

A migration `V10__activity_steps.sql` cria `activity_steps` vinculada a
`activities`.

Configuração tipada por coluna:

- `QUESTION` → `question_id`;
- `SLIDE` → `slide_content`;
- `WORD_CLOUD` → prompt, máximo de palavras e modo live/reveal;
- `POLL` → prompt, opções e modo de resultado.

Não existe `session_id` nessa tabela.

## API de autoria

```http
GET /api/activities/{activityId}/steps
PUT /api/activities/{activityId}/steps
```

O `PUT` recebe a sequência completa e o backend é responsável pelas posições.

### Regras

- máximo de 100 blocos;
- `QUESTION` só referencia questão da mesma atividade;
- Nuvem: pergunta obrigatória e 1–5 palavras por participante;
- Votação: pergunta obrigatória e 2–8 opções;
- IDs de opções de votação devem ser únicos;
- Slide exige conteúdo;
- exclusão de uma questão remove steps que dependem dela;
- cópia de atividade também copia o roteiro e remapeia questões.

## Fora deste incremento

Ainda **não** entram:

- `LiveStepState`;
- step atual da sessão;
- `NEXT` / `PREVIOUS`;
- WebSocket `LIVE_STEP_STATE`;
- `PollRound` / `PollVote`;
- criação automática de `WordCloudRound`;
- UI de autoria;
- UI de condução;
- projeção de `SLIDE` ou `QUESTION`.

Esses itens pertencem aos próximos incrementos do 12.4.

## Gate

```bash
cd backend
mvn -B -ntp verify
```

Depois:

```bash
cd ..
docker compose up -d --build
docker compose ps
```

Critérios mínimos:

- Flyway V1–V10;
- tabela `activity_steps`;
- todos os testes anteriores verdes;
- `ActivityStepIT` verde;
- cópia de atividade preservando o roteiro;
- nenhuma alteração em versão de `pom.xml`/`package.json`.
