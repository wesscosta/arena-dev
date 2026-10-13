---
name: ramuvi-ui-refactor
description: Audita e evolui as interfaces da Ramuvi sem perder identidade, acessibilidade, fluxos pedagógicos e contratos existentes. Usar em telas web, PWA, projetor e experiências de docente/aluno.
---

# Ramuvi · Product UI / Design Engineering

## Autoridade e limites
Esta skill é uma síntese autoral de práticas de design engineering, UI critique e redesign. **Não copia a estética dos repositórios de referência.** A verdade do produto e as decisões aprovadas têm precedência sobre conselhos genéricos das fontes.

- Produto: Ramuvi, plataforma educacional (antiga Arena Dev).
- Semântica: **Jornadas** = estudar em sequência; **Atividades** = produzir/entregar; **Arena** = participação ao vivo; **Biblioteca** = preparar/acessar materiais.
- Identidade provisória: C4.2–R1, aguardando homologação perceptiva e jurídica. Não afirmar que o monograma “r” operacional é logo definitivo.
- Fonte da UI: Manrope local em `frontend/public/fonts/`. Palavra-marca final vetorial substituirá o texto de navegação após homologação.
- Paleta-base: navy `#142B60`, azul `#205DE0`, verde-petróleo `#075F60`, dourado `#D4A74B`. Dourado é acento, não texto pequeno em fundo claro.
- Fonte de verdade do tema: `frontend/styles/theme.css` (semântica) + `tokens.css` + `ramuvi-brand.css`. Não criar novos valores sem documentar o papel semântico.
- Limites: preservar APIs, autenticação, persistência, sessões, pontos, histórico, acessibilidade e testes; não refazer arquitetura para “ficar moderno”.

## Procedimento obrigatório
1. **Ler contexto:** usuário, objetivo de aprendizagem e sessão, ações mais comuns, fluxo existente, dados reais e identidade. Não confundir tela de marketing com ferramenta docente.
2. **Auditar antes de desenhar:** registrar o que melhora o trabalho do usuário e o que é redundância, navegação duplicada, baixa clareza ou densidade incorreta.
3. **Priorizar problemas:** P0 bloqueio/erro, P1 hierarquia/fluxo, P2 consistência/legibilidade, P3 detalhes estéticos. Não otimizar P3 enquanto P0 existe.
4. **Definir forma:** começar por grade, densidade, ritmo, texto e estados. Preferir reutilizar componente existente. Não multiplicar cards nem construir efeitos sem função.
5. **Implementar:** preservar contratos, tokens semânticos e classes de integração. Refatorar incrementalmente em branch reversível.
6. **Motion criterioso:** ações frequentes sem animação; feedback de pressão 100–160ms; popover em ~150–200ms ease-out; sem bounce, loader ornamental ou `transition: all`. Respeitar `prefers-reduced-motion`.
7. **Mobile e PWA:** `dvh` quando necessário, safe areas, scroll vertical real, entradas com 16px+, touch targets 44px, hover somente para dispositivos que suportam; nunca desabilitar zoom.
8. **Estresse:** testar strings longas, turmas vazias, múltiplos alunos, erro de API, offline, teclado, leitor de tela, 200/400% zoom e Safari/iOS físico.
9. **Aceite verificável:** typecheck + lint + teste unitário + E2E relevante + inspeção visual claro/escuro em 390/768/1440px. Não declarar aprovado quando etapa não executada.

## Decisões específicas da Ramuvi
- O dashboard docente deve destacar uma **próxima ação real** derivada dos dados, não métricas falsas.
- Entrada da Arena deve manter contexto da turma; mecanismos de projeção não podem exigir scroll horizontal ou esconder controles essenciais.
- Controles de sorteio devem comunicar estado e consequência, sem estética de cassino nem roletas como opção exclusiva.
- Navegação não repete logos/breadcrumbs ou caminhos fictícios; títulos descrevem a tarefa, não apenas o módulo.
- Cor nunca é o único sinal de status. Contraste de texto aspira WCAG AAA (7:1); componentes interativos preservam pelo menos os requisitos WCAG 2.2.
- Manter zoom global e texto suficientemente grande; não reduzir fonte para “caber no card”.
- Sempre indicar o estado: **feito**, **verificado**, **pendente de validação humana**; nunca tratar captura ou mockup como teste de usabilidade.

## Guia de inspiração (não presets)
- Emil Kowalski: motion intencional, feedback mínimo, mobile-native, análise de edge cases.
- Impeccable: separar `PRODUCT.md` de `DESIGN.md`; shape → critique → audit → polish → harden.
- Taste Skill: usar o submódulo de redesign e o estilo editorial disciplinado para interfaces existentes; **não usar o preset padrão de landing pages** em dashboards.

Origem, licença e critérios de adoção: `docs/design/SKILL-SOURCES.md`.
