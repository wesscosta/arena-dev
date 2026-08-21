# Incremento 10 — Tempo real: Join, QR e Buzzer

## Objetivo

Fechar a principal fronteira restante do MVP: permitir que alunos entrem na sessão ativa pelo celular/notebook e participem de uma dinâmica Buzzer cuja ordem oficial é determinada pelo backend.

## Escopo implementado

### Código temporário da sessão

- toda `ClassSession` ativa recebe um código curto de 6 caracteres;
- sessões antigas ativas recebem o código de forma lazy ao abrir a área **Ao vivo**;
- o código pertence à sessão, não à turma;
- código expira automaticamente e é desativado ao encerrar a sessão;
- o professor pode rotacionar o código sem encerrar a aula;
- participantes já conectados continuam válidos após a rotação; somente novas entradas usam o novo código.

### QR Code

- QR é gerado pelo backend com ZXing;
- aponta para `/join?code=XXXXXX` no endereço pelo qual o professor abriu o frontend;
- quando o professor está usando `localhost`, a interface alerta que celulares precisam de um endereço alcançável na LAN ou de uma URL publicada.

### Entrada do aluno

Rota pública do frontend:

```text
/join?code=XXXXXX
```

Fluxo:

```text
Código/QR
  ↓
Sessão ativa
  ↓
Matrícula ou nome completo
  ↓
SessionParticipant existente
  ↓
token temporário opaco
  ↓
WebSocket
```

Regras:

- não existe criação de conta no MVP;
- a API não publica o roster completo da turma;
- primeiro tenta matrícula exata;
- depois tenta nome/apelido normalizado exato;
- correspondência ambígua exige matrícula;
- o token entregue ao navegador é aleatório; o banco guarda somente SHA-256;
- o token está sempre vinculado a um `SessionParticipant` e à sessão correspondente.

### Presença conectada

`present` e `connected` continuam conceitos diferentes:

- `present`: decisão pedagógica do professor;
- `connected`: socket ativo do aluno.

A conexão WebSocket atualiza `connected`, `joinedAt` e `leftAt`. Na inicialização do backend, conexões marcadas como ativas antes de um restart são limpas para evitar presença conectada fantasma.

### WebSocket

Endpoint:

```text
/ws/sessions/{sessionId}
```

Eventos usados no incremento:

```text
BUZZER_STATE
PARTICIPANT_CONNECTED
PARTICIPANT_DISCONNECTED
SESSION_FINISHED
ERROR
```

O professor usa o socket apenas para receber atualização imediata. CRUD e operações duráveis continuam em REST.

### Buzzer autoritativo

Fluxo:

```text
Professor abre rodada
  ↓
BUZZER_STATE = OPEN
  ↓
Aluno envia BUZZER_PRESS pelo WebSocket
  ↓
backend valida sessão + token + presença
  ↓
lock pessimista na rodada
  ↓
posição oficial gravada no PostgreSQL
  ↓
BUZZER_STATE transmitido a todos
```

O timestamp do navegador não participa da decisão.

A tabela `buzzer_presses` possui posição única por rodada e apenas um registro por participante. O lock pessimista da linha da rodada serializa cliques concorrentes antes do cálculo da posição.

O professor pode aplicar `+5` ou `+10 XP` diretamente ao primeiro colocado; o lançamento usa `ScoreEvent.source = BUZZER`.

## Migration

```text
V6__session_join_and_buzzer.sql
```

Adiciona:

```text
session_join_codes
session_participants.access_token_hash
buzzer_rounds
buzzer_presses
```

## API REST adicionada

```text
GET  /api/sessions/{sessionId}/join-code
POST /api/sessions/{sessionId}/join-code/rotate
GET  /api/sessions/{sessionId}/join-code/qr?baseUrl=...

GET  /api/join/{code}
POST /api/join/{code}

GET  /api/sessions/{sessionId}/buzzer
POST /api/sessions/{sessionId}/buzzer/open
POST /api/sessions/{sessionId}/buzzer/close
```

O clique do aluno não possui endpoint REST: ele é enviado pelo WebSocket como `BUZZER_PRESS`.

## UX do professor

A Arena ganha uma guia **Ao vivo**, sem aumentar novamente o scroll da aba Condução:

```text
Arena
├── Condução
├── Ao vivo
│   ├── Código/QR
│   ├── alunos conectados
│   └── Buzzer
├── Presença
├── Organização
└── Boss Battle
```

## UX do aluno

A página `/join` foi desenhada mobile-first e possui três estados principais:

1. informar/validar código;
2. identificar-se por matrícula ou nome;
3. acompanhar o Buzzer em tempo real.

Quando uma rodada abre, o botão é liberado automaticamente. Depois do clique o aluno vê a posição confirmada pelo servidor.

## Rede local

Para testar com celular na mesma rede:

1. frontend deve estar acessível pelo IP da máquina, por exemplo `http://192.168.1.20:3000`;
2. backend deve estar publicado em `:8080`;
3. CORS/WebSocket aceitam, por padrão de desenvolvimento, origens HTTP na porta 3000;
4. em produção, definir `APP_ALLOWED_ORIGIN_PATTERNS` com origens restritas.

O helper da visão do aluno substitui `localhost` pelo hostname usado no navegador quando necessário, evitando que o celular tente acessar `localhost:8080` nele próprio.

## Fora deste incremento

- autenticação/autorização completa do painel do professor (os endpoints de controle herdam a fronteira de confiança atual do MVP);
- autenticação institucional do aluno;
- aprovação manual de cada join;
- respostas A/B/C/D em tempo real;
- timer sincronizado;
- tela pública/projetor via WebSocket;
- Redis/pub-sub para múltiplas instâncias.

## Critérios de aceite

- [ ] sessão ativa apresenta código e QR;
- [ ] QR abre `/join` no celular;
- [ ] aluno é associado ao `SessionParticipant` correto;
- [ ] professor vê aluno conectado sem reload;
- [ ] duas ou mais conexões recebem abertura/fechamento do Buzzer em tempo real;
- [ ] cada participante registra no máximo um clique por rodada;
- [ ] ordem oficial independe do relógio do cliente;
- [ ] reload da tela do professor preserva rodada e ordem gravadas;
- [ ] XP do vencedor vira `ScoreEvent` com origem `BUZZER`;
- [ ] código deixa de funcionar após encerrar sessão.
