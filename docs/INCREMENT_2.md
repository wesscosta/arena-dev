# Incremento 2 — Organização da turma e questões em Atividades

## Objetivo

Adicionar capacidades acordadas sem alterar a identidade visual ou remover funções existentes da V1.

## Alterações funcionais

### Organização da turma

- `Individual`;
- `Duplas`;
- `Trios`;
- `Grupos de 4`;
- `Grupos de 5`.

O modo Individual cria apenas uma representação transitória da organização atual. Ele **não é salvo em `GroupHistory`**, pois não representa uma combinação entre alunos.

### Atividades

A tela **Atividades e XP** continua permitindo lançamento de XP e bônus por prazo, mas agora também permite:

- salvar atividade antes de lançar XP;
- reabrir uma atividade já criada;
- definir tema/tópico;
- registrar recurso externo opcional (plataforma + URL);
- incorporar questões à própria atividade.

### Questões

Formas de inclusão:

1. criar manualmente;
2. colar/importar JSON;
3. gerar prompt para IA externa.

Tipos V1:

- múltipla escolha;
- aberta;
- verdadeiro/falso;
- correção de bug;
- análise/interpretação;
- prática;
- situação-problema.

### Prompt Builder

Inputs mínimos:

- tema;
- nível;
- objetivo/contexto opcional;
- quantidade por tipo;
- orientações adicionais opcionais.

Presets:

- Revisão;
- Diagnóstico;
- Prática;
- Personalizado.

Não há integração com API de IA neste incremento. O prompt é copiado e a resposta retorna pelo contrato JSON V1.

## Compatibilidade

- atividades antigas sem `questions`, `topic` ou `resource` continuam válidas porque os novos campos são opcionais;
- o armazenamento continua local-first nesta etapa;
- backend do Incremento 1 não foi substituído;
- Arena, Boss Battle, sorteio, ranking, histórico e backup permanecem.

## Validações realizadas

- compilação TypeScript dos módulos puros (`types`, `store`, `game`, `activity-questions`) com `strict`;
- verificação sintática TS/TSX dos componentes alterados;
- pacote JSON de exemplo processado sem erros pelo validador;
- `createBalancedGroups(..., 1, ...)` validado retornando um aluno por unidade;
- integridade do ZIP validada;
- patch validado com `git apply --check` sobre o Incremento 1 limpo.

O build completo do Next.js deve ser confirmado no ambiente Docker do projeto, pois o ambiente de geração não possui as dependências npm instaláveis offline.

## Checklist manual após aplicar

- [ ] Dashboard e identidade visual permanecem iguais.
- [ ] Arena continua iniciando/encerrando sessão.
- [ ] Individual → Duplas → Trios → Grupos → Individual funciona na mesma sessão.
- [ ] Individual não aumenta `groupHistory` no backup JSON.
- [ ] Atividade antiga continua abrindo.
- [ ] Nova atividade pode ser salva sem lançamento de XP.
- [ ] Nova atividade pode ser reaberta e usada para lançar XP.
- [ ] Recurso externo abre em nova aba.
- [ ] Questão manual é adicionada.
- [ ] JSON exemplo é importado.
- [ ] JSON inválido mostra erros e não é incorporado.
- [ ] Prompt é gerado conforme quantidades solicitadas.
- [ ] Copiar prompt funciona no navegador.
- [ ] Backup exporta/importa atividades com questões.
