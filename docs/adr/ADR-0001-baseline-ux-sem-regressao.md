# ADR-0001 — Preservar a V1 como baseline de UX durante a reengenharia

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** produto, UX, migração

## Contexto

Uma reimplementação inicial da arquitetura moderna demonstrou Spring Boot, PostgreSQL, sessão, WebSocket e Buzzer, porém regrediu significativamente em estética, navegação e funcionalidades já existentes na V1 local-first. A V1 já possui dashboard, Arena, sorteio inteligente, Atividades e XP, Boss Battle, grupos, ranking, histórico e backup com identidade visual consolidada.

## Decisão

A V1 existente é a **baseline oficial de produto, UX e funcionalidades**. A reengenharia deve acontecer por baixo da experiência existente.

Nenhuma migração técnica autoriza remover, simplificar ou redesenhar uma funcionalidade já validada sem uma decisão explícita posterior.

A arquitetura nova é tratada como novo motor do produto, não como justificativa para substituir a experiência do produto.

## Consequências

### Positivas

- evita regressões visuais e funcionais;
- reduz risco de reescrever funcionalidades maduras;
- permite evolução incremental e comparável;
- preserva familiaridade para o professor.

### Custos e riscos

- algumas estruturas do frontend precisarão ser refatoradas mantendo o comportamento visual;
- durante a migração haverá coexistência temporária entre estado local e persistente.

## Alternativas consideradas

### Reescrever o frontend junto com o backend

Rejeitada porque aumentou escopo e produziu regressão de produto antes de existir paridade funcional.

## Critérios de validação

- [ ] uma migração de backend não altera a aparência sem necessidade funcional;
- [ ] nenhuma função existente desaparece silenciosamente;
- [ ] cada incremento possui teste de regressão funcional e visual básico.

## Relações

- Relacionados: ADR-0014, ADR-0015
- Substitui: nenhum
