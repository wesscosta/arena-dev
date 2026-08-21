# ADR-0007 — ScoreEvent como fonte de verdade e ranking como projeção

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** domínio, dados, auditoria

## Contexto

Manter um campo `student.score` como verdade principal cria múltiplas fontes de verdade e dificulta auditoria. Correções que apagam lançamentos também removem contexto importante da aula.

## Decisão

`ScoreEvent` é a fonte primária e auditável de XP.

O total é derivado da soma de eventos válidos. O ranking é uma **projeção/consulta** sobre esses eventos, filtrável por turma, sessão, período e origem.

Correções não apagam silenciosamente o evento original. Devem gerar evento inverso ou referência `reversalOf`.

Exemplo:

```text
+5 ANSWER
-5 CORRECTION (reversalOf: evento anterior)
```

Origens esperadas incluem Arena, atividade, Buzzer, colaboração, Boss Battle e lançamento manual.

## Consequências

### Positivas

- auditoria completa;
- ranking reconstruível;
- filtros e analytics tornam-se naturais;
- desfazer/corrigir não destrói histórico.

### Custos e riscos

- consultas agregadas podem exigir índices/materializações no futuro;
- UI precisa distinguir pontuação bruta e correções.

## Alternativas consideradas

### Campo de score atualizado diretamente

Rejeitada como fonte primária por risco de divergência.

### DELETE em score incorreto

Rejeitado por perda de auditabilidade.

## Critérios de validação

- [ ] ranking pode ser reconstruído apenas por eventos;
- [ ] correção mantém o lançamento original;
- [ ] evento registra origem suficiente para filtros futuros.

## Relações

- Relacionados: ADR-0006, ADR-0010, ADR-0012
