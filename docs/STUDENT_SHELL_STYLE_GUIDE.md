# Student Shell — Style Guide de Acessibilidade

**Status:** referência visual normativa do Student Shell  
**Base:** WCAG 2.2; alvo de projeto AAA onde aplicável, sem declarar conformidade até auditoria completa.

## Princípios

1. **Legibilidade antes de densidade.** Texto funcional não deve depender de tamanhos extremamente pequenos para caber.
2. **Estado não depende apenas de cor.** Concluído, atual, pendente e bloqueado combinam forma/ícone, texto quando necessário e contraste.
3. **Uma família de ícones.** Ícones de interface usam SVG de traço consistente; caracteres Unicode não são usados como chevrons ou pictogramas funcionais.
4. **Alvos confortáveis.** Controles relevantes miram 44 × 44 CSS px.
5. **Foco sempre visível.** Links, botões e campos recebem indicador de foco de alto contraste.
6. **Escala é preferência do usuário.** O Student Shell oferece escala de texto e deve continuar funcional com zoom/redimensionamento do navegador.
7. **Reader é editorial.** A área de leitura mantém medida confortável; o workspace pode crescer sem transformar parágrafos em linhas excessivamente longas.

## Tokens visuais

| Token | Uso |
|---|---|
| `--study-fg` | texto primário |
| `--study-fg-secondary` | texto editorial secundário |
| `--study-fg-muted` | metadados importantes |
| `--study-fg-subtle` | descrições auxiliares |
| `--study-accent` | ação/estado atual |
| `--study-border` | limites funcionais |
| `--study-focus` | foco de teclado |
| `--study-target` | referência de alvo interativo |

## Tipografia

- Corpo do Student Shell: base equivalente a 16 px em 100%.
- Preferência interna: 90%, 100%, 110%, 120%, 130%.
- O navegador continua livre para zoom até 200% ou mais.
- Texto de conteúdo: line-height mínimo de projeto 1.5; reader usa ~1.72.
- Evitar texto funcional abaixo de ~12 px equivalentes na escala padrão.
- Descrições devem permitir wrap; truncamento só em previews não essenciais.

## Journey

- Timeline é a linguagem primária de progresso.
- `check` = concluído; `play` = atual; círculo/índice = pendente.
- Badge textual de “Concluído” não deve duplicar o check.
- Capítulos são recolhíveis; ações “Recolher tudo” e “Expandir tudo” são complementares.
- Cards expandidos usam altura mínima visual próxima de 72–80 px, sem altura fixa.
- Conteúdo atual possui contraste e borda próprios; cor não é o único sinal.

## Reader

- Heading, artigo e footer compartilham eixo editorial.
- Zoom do material é independente da preferência global de texto.
- O zoom do reader serve especialmente apresentação/projeção; a preferência global serve legibilidade da aplicação.

## Critérios de validação

Antes de declarar conformidade AAA:
- medir contraste real de todos os tokens e estados;
- validar teclado completo e ordem de foco;
- validar foco não obscurecido e aparência de foco;
- testar 200% de texto/zoom e reflow;
- testar largura equivalente a 320 CSS px;
- testar overrides de text spacing;
- verificar nomes acessíveis e estados ARIA;
- testar leitor de tela;
- verificar mensagens de erro/status;
- revisar fluxos Live, Journey, Redemption e Reader.

## Dívida técnica

`study.module.css` contém camadas históricas do 16.3/16.4 que redefinem seletores. A camada **Student Shell Style Guide v1** ao final do arquivo é a autoridade corrente. Uma refatoração posterior deve consolidar/remover regras legadas sem alterar a interface validada.

## Estado no fechamento 16.4

Aplicado ao Student Shell no checkpoint de 28/09/2026: iconografia SVG, targets ampliados, foco visível, medida editorial responsiva e zoom global de 80–200%. O chrome (logo/sidebar) permanece estável enquanto a área de estudo escala. **AAA continua alvo de projeto, não certificação declarada**, até a auditoria manual listada neste documento e no fechamento do 16.4.
