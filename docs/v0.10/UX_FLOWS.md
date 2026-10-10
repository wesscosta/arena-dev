# Arena Dev v0.10 — Experiência do Professor, Estudante e Projetor

**Referência:** [Plano técnico](IMPLEMENTATION_PLAN.md) e [API](API_CONTRACTS.md). São wireflows descritivos de planejamento, ainda não telas implementadas.

## 1. Modelo mental: menos ferramentas, mais continuidade

Três planos independentes:

1. **O que apresento?** `LiveStage` (aluno/projetor com audiências distintas): material, pergunta, nuvem, resultado, sorteio ou estado neutro.
2. **O que estou conduzindo?** `LiveFlow`/`ActivityStep` para roteiro planejado, ou *ação ad hoc* da Arena. Só professor decide avançar.
3. **O que faço em seguida?** ação contextual derivada de *resultado* e *intenção* sem criar nova entidade ou tela obrigatória.

**Shell docente proposto:** cabeçalho = turma/sessão/QR/projetor; navegação lateral curta por intenção; centro = ferramenta ativa; trilho contextual = turma e ações disponíveis; drawers temporários = timer, presença, grupos, score. Não adicionar tabs duplicadas, modal para toda confirmação, menu que role horizontalmente nem elementos gamificados sem função.

## 2. Matriz das transições e CTAs

| Situação atual | Primária (no contexto) | Secundárias | Mantém referência |
|---|---|---|---|
| Início da aula | Abrir roteiro ou dinâmica | Abrir material; marcar presença | SessionId |
| Material aberto | Voltar ao roteiro / iniciar pergunta | Abrir origem | ResourceId, objectiveId? |
| Nuvem recebeu respostas | Explorar palavras | Abrir votação; verificar | CloudRoundId, LiveStage |
| Votação encerrada | Discutir distribuição | Nova votação; formar pares | PollRoundId |
| Verificação avaliada | Intervir | Nova verificação; analisar alternativas | RunId, LearningTargetId |
| Intervenção registrada | Verificar novamente | Mostrar material; grupos | LearningCycleId |
| Followup avaliado | Comparar resultados | Registrar encaminhamento; nova estratégia | Two run IDs |
| Sorteio PENDING | Resolver seleção | Apresentação Grid/Roleta | DrawAttemptId |
| Sorteio terminal | Sortear próximo | Pontuação manual separada; iniciar rodada | RoundNo, policy |
| Roteiro com step atual | Próximo passo explícito | Anterior; ação avulsa | ActivityStepId |

**Regra de não surpresa:** sair de uma ferramenta não deve iniciar outra execução, confirmar pontuação nem revelar respostas automaticamente. Ao retornar, mostrar estado obtido do servidor, não refazer sorteio. Roteiro **não avança** por `reveal`, `timer`, `score`, `poll` ou `draw.resolve`.

## 3. Wireflow do sorteio

```text
Arena > Sorteio
  Header: [Sorteio] [Pessoas chamadas na rodada 8/22] [Ajustes]
  Ajustes:
    Critério: (•) Rodada completa  ( ) Balanceado
    Visual:   (•) Grid + Spotlight ( ) Roleta
    [explicação curta do que muda e do que não muda]

  [Sortear participante] (disabled se há PENDING)
    ↓ servidor escolhe → mostra participante + aria-live
  ┌─ Resultado: Maria — Aguardando decisão ─────────────┐
  │ [Confirmar participação] [Confirmar e pontuar]        │
  │ [Passar a vez]            [Anular sorteio]            │
  └─────────────────────────────────────────────────────┘
    ↓ servidor resolve idempotentemente
  Resultado: Participou sem XP / Participou +5 XP /
             Passou a vez / Sorteio anulado
  [Próximo sorteio] ou [Iniciar próxima rodada]
```

- **Sem nova animação:** Grid e Roleta consomem o mesmo `DrawStateView`. A roleta não concede XP sem clique; Spotlight não oculta as ações até um CTA irrelevante. Em mobile, ações são botões empilhados acessíveis, sem scroll horizontal. O professor vê quatro ações; aluno/projetor veem somente seleção e orientação neutra.
- **Pontuação:** botão `Confirmar e pontuar` deve informar o valor e permitir ajuste antes do commit. Nunca associar XP por clicar em `Sortear`. Transação mostra sucesso apenas após confirmação servidor; durante latência usar loading, disabled e retry seguro.
- **Cobertura:** exibir `chamados nesta rodada` separadamente de `participaram` e `pontuação`; ausentes não entram no denominador. Se presença muda, avisar denom./elegíveis atualizados. Caso 1 aluno, mostrar aviso sobre repetição inevitável. Em caso de `VOIDED`, não mostrar como chamado.
- **Privacidade:** não projetar motivo de ausência, passagem, anulação, pontuação individual ou histórico de erros. Evitar ranking como padrão do Sorteio.
- **A11y:** reduzir animações; foco retorna ao CTA "Próximo sorteio" após resultado; `aria-live` com nomes curtos e sem spam; toque visível; cores não podem ser único sinal de status; manter zoom global e contraste.

## 4. Wireflow do Learning Loop

```text
Professor escolhe objetivo de aprendizagem (se ainda não escolhido)
  → Verificar (questão com opções e critério)
    → aluno responde individualmente e pode revisar até lock
    → professor encerra/avalia e vê distribuição agregada
    → CTA contextual: [Discutir resultados] [Registrar intervenção]
      → registro breve de estratégia: explicação/discussão/material
      → [Verificar novamente] cria NOVO run, não altera primeiro
        → aluno responde segunda vez (sem ver resposta privada de outros)
        → professor avalia e encerra
          → [Comparar resultados]: n primeira, n segunda, n pareados,
                                  ganhos/regressões e ausências
          → [Encaminhar para Jornada] (somente se contexto permitir)
```

**Estados vazios e falhas:** `sem turma`, `sem presentes`, `sem learning target`, `sem respostas`, `avaliação não encerrada`, `respostas parciais`, `sem pares`, `sem permissão`, `offline/reconectando`, `conflito por comando concorrente`. Cada estado precisa de próximo passo legível; não apresentar 0% quando não houve observação.

**Peer Instruction:** primeira resposta individual, intervalo de discussão em pares (timer opcional e grupos reutilizados), segunda resposta sem feedback individual do outro antes da segunda tentativa. Professor decide quando mostrar gabarito. Em turma heterogênea, formação automática por respostas só se houver consentimento pedagógico e privacidade; P2 pode usar formação manual no P1.

**Clínica do Erro:** mostrar distratores com contagem, espaço para anotação/intervenção do professor, CTA exibir recurso e CTA nova checagem. Sem estimar causa do erro a partir apenas do distractor.

## 5. Biblioteca como contexto: Canva e HTML

```text
Biblioteca > Material vinculado ao tema da aula
   ├─ MARKDOWN/TEXT → leitor nativo
   └─ LINK → cartão com título/origem e CTA [Abrir material ↗]
              [Retornar à Arena] preserva sessão, step, atividade e stage
                  └─ Após o material: ação contextual [Verificar]
```

**P0/P1:** nenhuma necessidade de iframe para entregar esse ganho. A Biblioteca já suporta `LINK`; o valor está no fluxo de reuso. Não consumir estrutura de arquivo externo como se fosse conteúdo canônico, nem fazer scraping silencioso. O docente é informado quando conteúdo é hospedado por terceiro.

**P2 experimental:** visor iframe apenas quando mantém navegação/sessão melhor do que abrir nova aba em dois casos reais (Canva publicado + simulador HTML externo). Abandonar iframe se quebrar foco, navegação de slides, responsividade, privacidade ou estabilidade. Link aberto em guia permanece fallback e pode ser a UX preferida.

## 6. Microcopy, design e validação com usuários

- `Sorteio` → `Chamado` → `Participação confirmada` (jamais contar `sorteado` como `participou`).
- `Verificar aprendizagem` deve explicar o objetivo e o que será coletado; `Quiz` somente se intenção diferente estiver visível. Evitar dois botões com mesmo significado técnico.
- `Melhora nesta verificação` em vez de `Alcançou domínio`; `Sem amostra pareada` em vez de `0%`.
- `Meta Coletiva`, se adotada depois, refere-se a uma tarefa pedagógica e não "HP do Boss".
- Convidar 2 docentes com experiências distintas (condução dinâmica e roteiro) e ao menos 1 aluno/avaliador para testes de fluxo. Registrar tempo de troca de ferramenta, bloqueios e passos que causam confusão, não só opinião estética. Números e thresholds serão definidos sobre baseline observada.

## 7. Responsividade e acessibilidade

Aferir 360, 390, 768, 1024, 1440 e ultrawide, zoom navegador 200% e zoom global maior que 130%, light/dark, teclado, leitor de tela e rede intermitente. Alvo mínimo **WCAG 2.2 AA**, buscar critérios AAA que sejam aplicáveis e tecnicamente mensuráveis (por exemplo contraste melhorado), sem alegar conformidade global AAA. Preferir fontes maiores, 7:1 para texto normal quando viável, componentes com foco visível, largura distribuída sem cards gigantes e navegação sem overflow lateral. Modo projetor tem audiência de leitura, não de interação docente.
