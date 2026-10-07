# ADR-0046 — Arena Learning Core como fundação da v0.9

- **Status:** Aceito
- **Data:** 2026-10-07
- **Decisores:** equipe Arena Dev
- **Escopo:** arquitetura | produto

## Contexto

A v0.8 consolidou sessão ao vivo, Quiz, Votação, Nuvem, Groups, Timer, Spotlight e Biblioteca, mas essas capacidades ainda possuem runtimes e contratos especializados. A v0.9 também precisa preparar uma base semanticamente útil para Learning Loop e IA sem transformar IA em dependência operacional.

## Decisão

A v0.9 é definida como **Arena Learning Core**.

O core passa a representar explicitamente:

```text
LearningTarget
→ Interaction
→ Response
→ Evaluation
→ Result
→ LearningEvidence
```

A Arena continua sendo o domínio síncrono. Jornada continua sendo estudo sequencial, Atividade continua sendo fazer/entregar/avaliar e Biblioteca continua sendo conteúdo canônico/reutilizável.

A IA futura consome o domínio estruturado; não define regras essenciais do core.

## Consequências

### Positivas

- reduz duplicação entre dinâmicas;
- permite evidência rastreável;
- prepara dados para IA sem infraestrutura especulativa;
- mantém fronteiras entre Arena, Jornada, Atividade e Biblioteca.

### Custos e riscos

- parte importante da v0.9 será estrutural e pouco visível;
- exige migração incremental dos runtimes existentes;
- abstrações novas precisam ser validadas pelo Quiz real antes de expansão.

## Alternativas consideradas

### Adicionar IA antes do domínio semântico

Rejeitada porque embeddings, prompts e LLMs sobre dados ambíguos criariam acoplamento e baixa auditabilidade.

### Evoluir cada dinâmica de forma independente

Rejeitada porque amplia duplicação de resposta, resultado, realtime e testes.

## Critérios de validação

- [ ] fluxo LearningTarget → Evidence funciona sem IA;
- [ ] Quiz real opera sobre o novo core via adapter;
- [ ] Poll e Text podem usar o mesmo core;
- [ ] nenhum domínio assíncrono passa a depender da sessão ao vivo.

## Relações

- ADRs relacionados: ADR-0004, ADR-0006, ADR-0012, ADR-0016, ADR-0017, ADR-0021, ADR-0045
- Substitui: nenhum
- Substituído por: nenhum
