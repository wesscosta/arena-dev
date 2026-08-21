# ADR-0013 — Integrar ferramentas externas em vez de recriar seus ecossistemas

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** produto, integração

## Contexto

Ferramentas especializadas de quiz já oferecem experiências completas de quiz ao vivo, relatórios e conteúdo. Recriar integralmente essas plataformas aumentaria o escopo do Arena Dev e desviaria do objetivo principal: gerenciar e gamificar a aula.

## Decisão

O Arena Dev implementa nativamente apenas o que suas próprias dinâmicas exigem e trata plataformas especializadas como **recursos externos da Activity**.

Uma atividade pode registrar:

- plataforma;
- URL;
- metadados mínimos necessários.

A importação de resultados será adicionada posteriormente por **adaptadores específicos de formato/arquivo**, quando houver formato estável e benefício claro.

O domínio não deve depender de uma marca/plataforma específica.

## Consequências

### Positivas

- reduz escopo;
- mantém Arena Dev como central da aula;
- permite aproveitar ferramentas maduras;
- facilita adicionar novos provedores.

### Custos e riscos

- formatos de relatório externos podem mudar;
- importação precisará mapear alunos com segurança.

## Alternativas consideradas

### Construir clone completo de plataforma de quiz

Rejeitada por sobreposição de produto e complexidade excessiva.

### Não permitir ferramentas externas

Rejeitada porque obrigaria o professor a abandonar recursos já úteis.

## Critérios de validação

- [ ] Activity pode abrir recurso externo sem quebrar fluxo interno;
- [ ] adaptador futuro não altera o núcleo do domínio;
- [ ] resultados importados geram eventos auditáveis, não sobrescrevem score.

## Relações

- Relacionados: ADR-0007, ADR-0010, ADR-0011
