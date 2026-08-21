# ADR-0018 — Usar fronteira limpa ao migrar o domínio de turma para o backend

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** migração, persistência, compatibilidade

## Contexto

Os Incrementos 1–3 foram usados para validar UX e mecânicas com `Classroom`, `Student` e `Enrollment` ainda representados por IDs gerados no navegador. O backend persistente usa UUIDs próprios. Manter os dados experimentais exigiria criar um migrador temporário capaz de reconstruir e remapear referências em atividades, sessões, XP e histórico.

Neste estágio os dados ainda não são considerados produção e é aceitável reiniciar o banco/ambiente de testes.

## Decisão

O Incremento 4 estabelece uma **fronteira limpa de persistência**:

1. `Classroom`, `Student` e `Enrollment` passam a ter o backend/PostgreSQL como única fonte de verdade;
2. registros antigos desses três domínios existentes no `localStorage` não serão importados nem remapeados;
3. ao detectar o domínio de turma legado no armazenamento local, os módulos local-first experimentais também começam vazios para evitar referências órfãs;
4. durante a validação deste incremento é permitido resetar o volume PostgreSQL;
5. novas sessões, atividades e eventos locais passam a referenciar os UUIDs recebidos da API.

A permissão de reset é uma exceção da fase de desenvolvimento e **não** define a estratégia de upgrade de versões com dados reais.

## Consequências

### Positivas

- elimina código descartável de remapeamento;
- reduz risco de IDs inconsistentes;
- torna explícita a mudança da fonte de verdade;
- simplifica testes do primeiro domínio efetivamente migrado.

### Custos e riscos

- dados experimentais dos incrementos local-first anteriores não são preservados;
- usuários de desenvolvimento precisam recriar turmas/dados de teste;
- backups legados só podem restaurar módulos compatíveis com IDs já existentes no backend.

## Alternativas consideradas

### Migrar e remapear todos os dados locais

Rejeitada neste estágio. O custo seria alto para preservar dados de teste sem valor durável e criaria uma camada que seria removida logo depois.

### Continuar espelhando o domínio no localStorage

Rejeitada. Ter duas fontes autoritativas aumentaria a chance de divergência e contrariaria a migração domínio por domínio definida no ADR-0014.

## Critérios de validação

- [ ] reload não depende de turmas/alunos salvos no navegador;
- [ ] IDs do domínio migrado são emitidos pelo backend;
- [ ] o frontend não grava cópia autoritativa do domínio migrado;
- [ ] dados locais antigos não geram objetos órfãos visíveis;
- [ ] documentação deixa claro que reset destrutivo é apenas de desenvolvimento.

## Relações

- Complementa: ADR-0014
- Relacionados: ADR-0003, ADR-0005
- Implementação: `docs/INCREMENT_4.md`
