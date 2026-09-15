# Incrementos 14.4A/14.4B — Entregas visíveis e fluxo visual do aluno

## Motivo

O domínio de submissões já existia, mas o backend estava à frente da experiência visual. O professor tinha o dashboard implementado, enquanto o aluno ainda não possuía um fluxo explícito para abrir uma atividade do catálogo, produzir a entrega e enviá-la.

## 14.4A — Visibilidade do professor

O workspace de entregas permanece acessível por:

```text
Turma → Atividades → Entregas
```

No dashboard, submissões enviadas ou em revisão oferecem `Corrigir`, levando ao workspace individual do 14.4.

## 14.4B — Fluxo visual do aluno

Após se identificar no `/join`, o aluno passa a ver `Minhas atividades` com o catálogo da própria turma.

Fluxo:

```text
Entrar na sessão
  ↓
Minhas atividades
  ↓
Iniciar / Continuar
  ↓
respostas de questões
+ texto/pesquisa
+ código
+ link
+ referência de artefato
  ↓
autosave
  ↓
Enviar atividade
```

## Segurança

O fluxo do aluno não usa sessão administrativa do professor.

As rotas públicas exigem o `X-Participant-Token` temporário já emitido pelo `/join`. O backend valida:

- código/sessão ativa;
- token do participante;
- matrícula ativa na turma;
- atividade pertencente à mesma turma;
- submissão pertencente ao próprio aluno.

## Regras preservadas

- `ActivitySubmission` continua fonte de verdade da entrega;
- `SubmissionItem` continua polimórfico;
- `ParticipantAnswer` continua exclusivo do Quiz ao vivo;
- após `SUBMITTED`, a tentativa deixa de aceitar alterações;
- resposta esperada, explicação e correção nunca são enviados ao aluno;
- `ScoreEvent` continua independente.

## Limites atuais

`FILE` continua representando referência/metadados; upload binário real exige decisão de storage futura. O fluxo visual cobre texto, questão, código, link e referência de artefato sem bloquear a evolução posterior.

## Gate de aceite

- professor consegue abrir `Entregas` a partir da atividade;
- aluno vê atividades da turma após identificação;
- iniciar cria/restaura `ActivitySubmission`;
- respostas existentes são restauradas;
- autosave persiste `SubmissionItem`;
- envio altera para `SUBMITTED`;
- professor vê o aluno em `Entregues` e pode clicar em `Corrigir`;
- backend/frontend gates verdes.

## Próximo incremento

**14.5 — Rubricas e avaliação estruturada.**
