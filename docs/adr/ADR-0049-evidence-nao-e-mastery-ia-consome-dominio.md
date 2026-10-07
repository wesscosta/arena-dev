# ADR-0049 — LearningEvidence não é Mastery e IA consome o domínio

- **Status:** Aceito
- **Data:** 2026-10-07
- **Decisores:** equipe Arena Dev
- **Escopo:** arquitetura | dados | IA

## Contexto

Uma resposta correta é uma observação. Dizer que um estudante domina um tópico é inferência sobre múltiplas observações. Misturar os dois conceitos tornaria o histórico irreprocessável e incentivaria falsa precisão. A mesma separação é necessária para avaliações futuras assistidas por IA.

## Decisão

Persistir `LearningEvidence` como observação estruturada e manter Mastery como projeção futura.

```text
Response
→ Evaluation
→ LearningEvidence
→ future MasteryProjection
```

Resposta bruta nunca é sobrescrita pela avaliação.

IA futura poderá gerar ou auxiliar projeções, feedback e classificação, mas suas saídas terão proveniência e não substituirão os dados observados.

A v0.9 não implementa RAG, embeddings, agentes ou Mastery avançado.

## Consequências

### Positivas

- permite recalcular projeções no futuro;
- preserva auditabilidade;
- reduz risco de IA virar fonte de verdade indevida.

### Custos e riscos

- mais de uma camada de dados precisa ser mantida;
- UI deve diferenciar acerto de domínio estimado.

## Alternativas consideradas

### Salvar somente score/mastery calculado

Rejeitada porque perde a observação original e impede reprocessamento confiável.

### Usar IA como avaliador padrão

Rejeitada na fundação porque o core deve funcionar deterministicamente.

## Critérios de validação

- [ ] Response permanece imutável em relação ao resultado da avaliação;
- [ ] Evidence aponta para LearningTarget e origem;
- [ ] um Poll/opinião não produz Evidence por padrão;
- [ ] nenhuma função essencial da v0.9 exige LLM.

## Relações

- ADRs relacionados: ADR-0037, ADR-0038, ADR-0043, ADR-0046, ADR-0048
- Substitui: nenhum
- Substituído por: nenhum
