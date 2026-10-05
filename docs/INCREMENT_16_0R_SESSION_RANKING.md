# 16.0R — Arena Session Ranking

**Estado:** implementado na linha de estabilização da v0.8  
**Data de consolidação:** 05/10/2026  
**Natureza:** evolução transversal pós-16.0; não reabre o incremento histórico do Professor Arena Experience.

## Objetivo

Adicionar à Arena um ranking **da sessão atual** como ferramenta contextual de feedback ao professor. O ranking é uma projeção dos pontos já registrados pela Arena e não cria uma segunda economia, uma nova fonte de score ou uma medida de domínio acadêmico.

```text
ScoreEvent da sessão
        ↓
agregação autoritativa
        ↓
SessionRanking
      ↙       ↘
Professor    Projetor
              ↑
      exibição explícita
```

## Decisões de produto

- nome público: **Ranking da sessão**;
- fica em **Ferramentas**, não em Dinâmicas;
- padrão privado no professor;
- o professor decide quando `Exibir no projetor` e `Ocultar do projetor`;
- `Top 5` é a visualização padrão; `Todos` permanece disponível;
- o Projetor pode ocultar identidades e receber apenas iniciais;
- o ranking representa **pontuação/participação da aula**, não Mastery;
- não há ranking global, histórico, entre turmas, liga, temporada ou recompensa automática por posição.

## Fonte de verdade

`ScoreEvent` permanece a única fonte de pontuação. Somente eventos que possuem `sessionId` igual à sessão consultada entram no ranking. Eventos da mesma turma mas de outra sessão não são somados.

Reversões continuam sendo `ScoreEvent` negativos e, portanto, afetam o total pela mesma regra de agregação. Nenhum campo `rankingScore`, `leaderboardScore` ou equivalente foi introduzido.

## Regra de classificação

1. somar `points` por estudante dentro da sessão;
2. ordenar por score decrescente;
3. usar nome público e `studentId` apenas como desempate determinístico de apresentação;
4. aplicar **competition ranking** aos empates.

Exemplo:

```text
1  Ana       100
1  Bruno     100
3  Clara      80
4  Diego       0
```

Em `Top 5`, entram somente participantes que já receberam ao menos um evento de pontuação naquela sessão. Em `Todos`, participantes da sessão sem evento também aparecem com zero.

## Persistência da apresentação

A preferência pública da sessão usa o boundary já existente de `SessionDynamic`:

```text
DynamicType.RANKING
{
  visible,
  anonymized,
  limit
}
```

Não foi criada migration porque `session_dynamics.type` já aceita o novo valor como texto e a estrutura atual suporta estado JSON por tipo.

O Ranking **não é** um `LiveStage`. Essa separação é intencional: ele funciona como uma projeção/overlay temporário. Quiz, Sorteio, Buzzer ou outro palco ativo continuam preservados. Ao ocultar o Ranking, o Projetor retorna ao contexto que já estava ativo.

## Backend

Novos boundaries:

- `SessionRankingService`;
- `SessionRankingController`;
- `RankingLimit`;
- `ScoreEventRepository.findBySessionIdOrderByCreatedAtAsc`.

API privada:

```text
GET /api/sessions/{sessionId}/ranking
PUT /api/sessions/{sessionId}/ranking/presentation
```

Eventos realtime:

```text
SESSION_RANKING_STATE   → professor
PUBLIC_RANKING_STATE    → projetor
```

Criação, criação em lote e reversão de `ScoreEvent` notificam o ranking somente quando o evento está associado a uma sessão.

## Privacidade

O estado do professor e o estado público são DTOs diferentes. Professor recebe identificação completa necessária à operação. O Projetor recebe somente posição, `displayName` e score.

Quando `anonymized=true`, `displayName` já sai do backend como inicial (`A.`, `B.`, ...). O nome completo não é enviado e não fica apenas escondido por CSS.

O runtime do participante recebe uma projeção de ranking **oculta e vazia**, impedindo vazamento da classificação pública pelo snapshot de `/join`.

## Frontend

### Professor

`RankingPanel` vive dentro do `ArenaToolDrawer` e oferece:

- Top 5 / Todos;
- lista ordenada e posições;
- estado `PRIVADO` / `NO PROJETOR`;
- opção `Ocultar nomes no projetor`;
- `Exibir no projetor`;
- `Atualizar projetor`;
- `Ocultar do projetor`;
- empty state;
- explicação explícita de que pontuação da sessão não equivale a domínio de aprendizagem.

### Projetor

`ProjectorView` consome o estado público do runtime inicial e os eventos realtime. Ranking visível tem prioridade de apresentação enquanto ativo, sem destruir o `LiveStage` subjacente.

Não foram introduzidos troféus, moedas, podium 3D, efeitos de cassino ou linguagem de “melhores alunos”.

## Responsividade e acessibilidade

- tokens semânticos nos componentes do professor;
- foco visível e controles nativos;
- lista ordenada semanticamente;
- posição também textual, não comunicada apenas por cor;
- nenhuma região `aria-live` envolve a lista completa;
- drawer adaptado para mobile;
- navegação compacta da Arena passou a ter nomes acessíveis explícitos e scroll horizontal contido;
- matriz validada em 390, 768, 1024, 1440, 1920 e 2560 px, nos temas dark e light.

## Validação automatizada

Cobertura dedicada:

- agregação por sessão;
- empate `1,1,3`;
- participantes com zero;
- reversões;
- anonimização pública;
- persistência da preferência de projeção;
- separação professor/projetor/participante;
- CSRF da atualização de apresentação;
- atualização realtime;
- reload do Projetor;
- restauração do palco anterior ao ocultar;
- Top 5 / Todos;
- matriz responsiva e dark/light.

E2E dedicado:

```text
frontend/e2e/arena-session-ranking.spec.ts
```

## Fora do escopo

Permanecem deliberadamente fora:

- ranking global;
- ranking entre turmas;
- ranking semanal/mensal;
- histórico competitivo;
- ligas e temporadas;
- badges ou recompensas por colocação;
- ranking de professor;
- vínculo com Mastery;
- ranking de aprendizagem;
- equipes, até existir validação de uso real.

Qualquer evolução de validação acadêmica continua pertencendo ao eixo `17.x`, no qual concluir, pontuar ou ler não equivale automaticamente a dominar.
