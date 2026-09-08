# ADR-0027 — Live Stage autoritativo e projeções por audiência

- **Status:** Aceito
- **Data:** 2026-09-08
- **Escopo:** domínio, realtime, UX, privacidade

## Contexto

Projetor, `/join`, Sorteio, Nuvem, Buzzer, Timer e futuro Poll estavam evoluindo como módulos com decisões próprias sobre exibição. Continuar adicionando flags como `showDraw`, `showPoll` e `showWordCloud` permitiria estados concorrentes e transformaria o shell da Arena em uma composição guiada por features.

ADR-0017 já estabelece Professor, participante e Projetor como experiências do mesmo sistema, mas faltava definir **qual estado compartilhado elas projetam**.

## Decisão

Introduzir `LiveStageState` como estado autoritativo de apresentação da `ClassSession`.

Regras:

1. existe no máximo um `primary` por sessão;
2. `primary.type` define qual dinâmica/conteúdo ocupa o palco;
3. `audience` define `PROJECTOR`, `PARTICIPANTS` ou `BOTH`;
4. Timer permanece ferramenta transversal e pode ser overlay; quando solicitado, `TIMER` também pode assumir o palco principal;
5. Professor, Projetor e `/join` derivam **projeções diferentes do mesmo estado**;
6. o backend filtra identidade e dados sensíveis antes de transmitir payload público;
7. `LIVE_STAGE_STATE` seleciona o palco, mas não substitui estados detalhados de módulos como `WORD_CLOUD_STATE`, `BUZZER_STATE` e `TIMER_STATE`;
8. tipos podem entrar no vocabulário antes da UI, mas só devem ser ativados quando tiverem adapter completo de estado, projeção e renderização.

Persistência inicial usa `SessionDynamic` com `DynamicType.LIVE_STAGE`, aproveitando a unicidade existente por `(session_id, type)` e evitando nova tabela/migration sem necessidade demonstrada.

## Consequências

### Positivas

- elimina flags concorrentes por feature;
- um único fato define o palco atual;
- Projetor deixa de ser “feature” e passa a ser projeção pública;
- `/join` pode oferecer UI individual sem duplicar estado de sessão;
- novas dinâmicas entram por adapters incrementais;
- política de audiência e privacidade fica no backend.

### Custos e riscos

- módulos existentes precisam ser conectados progressivamente ao Live Stage;
- live flow e live stage continuam conceitos diferentes e exigirão orquestração explícita;
- manter eventos especializados e `LIVE_STAGE_STATE` exige disciplina para não duplicar responsabilidades.

## Alternativas consideradas

### Booleanos por dinâmica

Rejeitada por permitir combinações inválidas e escalar mal com Poll, Quiz, Boss Battle e futuras mecânicas.

### Um payload gigante contendo todo o runtime da aula

Rejeitada por acoplamento excessivo, exposição desnecessária de dados e dificuldade de evolução independente dos módulos.

### Projetor e `/join` com estados independentes

Rejeitada por risco de divergência do que a turma está efetivamente fazendo.

## Critérios de validação

- [x] um único `LIVE_STAGE` persistido por sessão;
- [x] projeções distintas para professor, Projetor e participante;
- [x] Sorteio não expõe `studentId` ao Projetor;
- [x] Sorteio, Nuvem e Buzzer assumem o palco;
- [x] Timer pode coexistir como overlay;
- [ ] Slide/Question/Boss/Poll/Quiz recebem adapters completos progressivamente.

## Relações

- Complementa: ADR-0004, ADR-0006, ADR-0016, ADR-0017, ADR-0020, ADR-0023.
