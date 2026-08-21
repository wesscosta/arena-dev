# Incremento 8 — Resultados de atividades externas

## Objetivo

Permitir que o professor use ferramentas especializadas de quiz/formulários sem transformar o Arena Dev em um clone dessas plataformas. O recurso externo continua pertencendo à `Activity`, e o Arena Dev passa a importar o resultado do aluno de forma auditável.

## Fluxo

```text
Turma → Atividades
        ↓
atividade externa
        ↓
Importar resultados
        ↓
CSV / TSV
        ↓
normalização do arquivo
        ↓
match com alunos da turma
        ↓
preview + correções manuais
        ↓
XP proporcional
        ↓
confirmar importação
        ↓
ExternalResultImport + ScoreEvent
```

## Formatos suportados

O frontend possui aliases/adaptadores leves para reconhecer exports de:

- Wayground / Quizizz;
- Microsoft Forms;
- Google Forms;
- Kahoot!;
- CSV/TSV genérico.

O parser procura semanticamente colunas de nome, matrícula/registro, pontuação, pontuação máxima e percentual. O núcleo não possui dependência de SDK ou API proprietária.

## Matching seguro

O backend associa cada linha somente aos alunos com matrícula ativa na turma da atividade. A ordem de tentativa é:

1. `studentId` escolhido manualmente no preview;
2. matrícula/registro exato normalizado;
3. nome ou apelido exato normalizado, desde que o resultado seja único.

Não há fuzzy matching automático nesta etapa. Uma linha ambígua permanece pendente até o professor selecionar o aluno correto.

## XP

O modo inicial é proporcional:

```text
XP = round(activity.points × percentual / 100)
```

Quando o arquivo não possui percentual, usa-se `score / maxScore`. Se a pontuação máxima não estiver no arquivo, o professor informa uma única pontuação máxima para o relatório.

O XP é limitado naturalmente ao intervalo de 0% a 100%. Uma atividade com `points = 0` pode ter o relatório auditado sem gerar `ScoreEvent`.

## Auditoria e idempotência

A migration `V5__external_activity_results.sql` adiciona:

- `external_result_imports`;
- `external_result_rows`.

Cada importação registra plataforma, nome do arquivo, contagens, linhas, aluno associado e XP calculado. Um fingerprint SHA-256 do conteúdo normalizado é único por atividade e bloqueia reimportação acidental do mesmo relatório.

Os lançamentos de XP continuam usando `ScoreEvent` com `source = ACTIVITY`, preservando ranking e reversão já implementados.

## API

```text
POST /api/activities/{activityId}/external-results/preview
POST /api/activities/{activityId}/external-results/import
GET  /api/activities/{activityId}/external-results/imports
```

`preview` não grava nada. `import` exige que todas as linhas estejam resolvidas e executa auditoria + ScoreEvents na mesma transação.

## UX

O botão `Importar resultados` aparece somente em atividades do tipo `EXTERNAL`. O modal mostra:

- arquivo selecionado;
- plataforma detectada;
- escala de pontuação;
- quantidade de linhas;
- match de cada aluno;
- pendências/duplicidades;
- percentual e XP que serão aplicados;
- últimas importações daquela atividade.

A ação final permanece desabilitada enquanto houver linha sem aluno, aluno duplicado, escala de nota inválida ou relatório já importado.

## Fora deste incremento

- conexão direta com APIs proprietárias;
- sincronização automática com Microsoft/Google/Kahoot;
- importação por OAuth;
- respostas ao vivo pelo celular;
- WebSocket/Buzzer.

Esses itens não são necessários para cumprir o ADR-0013 e aumentariam acoplamento ou complexidade antes do incremento de tempo real.
