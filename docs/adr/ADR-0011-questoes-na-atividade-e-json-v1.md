# ADR-0011 — Questões na atividade, JSON v1 e Prompt Builder provider-agnostic

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** domínio, interoperabilidade, IA

## Contexto

O professor precisa preparar questões rapidamente para tipos de aula muito diferentes sem transformar o Arena Dev em um gerenciador pesado de banco de questões e sem depender de uma API específica de IA.

## Decisão

Questões são incorporadas à `Activity` como fluxo principal.

Formas de inclusão:

1. criação manual;
2. importação/colagem de JSON;
3. geração de prompt estruturado para IA externa.

O contrato oficial de intercâmbio é **Arena Dev Question Package v1**, `version: "1.0"`, em JSON.

Tipos iniciais:

- `MULTIPLE_CHOICE`;
- `OPEN`;
- `TRUE_FALSE`;
- `BUG_FIX`;
- `ANALYSIS`;
- `PRACTICAL`;
- `SCENARIO`.

O Prompt Builder solicita poucos inputs: tema, nível, objetivo/contexto, quantidades por tipo e orientação adicional opcional. Presets curtos podem acelerar uso. O sistema recomenda pacotes enxutos (tipicamente 6–10 questões para uma atividade rápida) e apenas alerta, sem bloquear, quando o total ultrapassa 15 questões.

O sistema **não exige API de IA no MVP**. O professor copia o prompt, usa a IA que preferir e cola/importa a resposta.

Antes de incorporar questões, o JSON deve ser validado e exibido para revisão/preview. Resposta inválida não altera a atividade.

## Consequências

### Positivas

- provider-agnostic;
- sem chave/API/custo obrigatório no Arena Dev;
- formato reproduzível e testável;
- mesma infraestrutura pode suportar integração direta futura.

### Custos e riscos

- respostas de IA podem vir inválidas e exigem validação robusta;
- schema precisa de versionamento compatível.

## Alternativas consideradas

### Banco de questões obrigatório antes de criar atividade

Rejeitada por adicionar fricção ao fluxo principal.

### Integração direta com um único provedor de IA desde o início

Rejeitada por custo, lock-in e complexidade prematuros.

### CSV como formato principal

Rejeitado por dificuldade com alternativas, critérios e estruturas aninhadas.

## Critérios de validação

- [ ] pacote JSON v1 inválido é rejeitado sem mutação parcial;
- [ ] múltipla escolha exige quatro opções e uma resposta válida;
- [ ] Prompt Builder gera exatamente a quantidade solicitada por tipo;
- [ ] atividade antiga sem questões continua válida.

## Relações

- Relacionados: ADR-0010, ADR-0013, ADR-0015
- Contrato: `docs/question-package-v1.schema.json`
