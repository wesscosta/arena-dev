# ADR-0042 — Hard delete de turma é explícito e transacional

**Status:** Aceito  
**Data:** 12/09/2026

## Decisão

A exclusão definitiva de `Classroom`:

- exige o nome exato no frontend e backend;
- é bloqueada durante sessão ativa;
- executa em uma única transação;
- apaga explicitamente o grafo pertencente à turma;
- preserva `Student`.

Não adicionamos `ON DELETE CASCADE` global em `classrooms`.

## Motivo

Uma cascade de raiz permitiria que uma deleção SQL acidental apagasse sessões, atividades e o ledger de XP
sem passar pela confirmação da aplicação.

Além disso, novas tabelas futuras seriam apagadas automaticamente sem uma decisão explícita de retenção.

O desenho escolhido falha de forma segura: uma nova FK não tratada interrompe o hard delete.
