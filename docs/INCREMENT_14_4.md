
# Incremento 14.4 — Correção individual

## Objetivo

Abrir uma entrega real do dashboard e permitir ao professor revisar aluno por aluno, preservando contexto e rascunho privado.

## Fluxo

```text
SUBMITTED
  ↓ abrir correção
UNDER_REVIEW
  ↓
visualizar entrega + referência
  ↓
anotações privadas
  ↓
Salvar rascunho / Salvar e revisar próxima
```

## V20 — submission_assessments

O 14.4 cria o shell persistente de `Assessment`, ainda sem nota ou rubrica estruturada.

Campos iniciais:

```text
id
submission_id (unique)
teacher_notes
created_at
updated_at
version
```

O objetivo é não misturar rascunho do professor com `ActivitySubmission` ou `SubmissionItem`.

## Interface

A partir do dashboard de entregas:

- **Corrigir** abre a entrega;
- mostra aluno, tentativa e itens enviados;
- para `QUESTION_RESPONSE`, mostra enunciado e resposta esperada quando existente;
- mostra código/explicação de apoio quando aplicável;
- permite navegar anterior/próximo;
- permite salvar anotações privadas;
- **Salvar e revisar próxima** reduz navegação repetitiva.

## Regra de publicação

`teacher_notes` é privado e nunca é exibido ao aluno.

O 14.4 não publica feedback, nota nem XP.

## Fora de escopo

- rubrica e critérios;
- nota/score da avaliação;
- IA;
- feedback publicado;
- ações Aceitar/Editar/Reanalisar/Descartar.

## Próximo incremento

**14.5 — Rubricas e avaliação estruturada**: expandir `Assessment` com critérios e pontuação auditável, mantendo nota separada de XP.
