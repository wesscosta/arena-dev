# Consolidação da Visão geral de turmas — MVP

**Data:** 03/10/2026  
**Linha:** v0.8 — Gate de Estabilização Arquitetural  
**Branch:** `chore/v0.8-architecture-stabilization`

## Objetivo

Consolidar a descoberta e entrada em turmas sem transformar o Arena Dev em um LMS administrativo genérico.

O problema tratado é operacional:

- localizar rapidamente uma turma;
- distinguir turmas ativas de inativas;
- continuar o trabalho no contexto correto;
- tornar Biblioteca um destino global compreensível;
- garantir consistência real entre light e dark;
- manter cards úteis em mobile, desktop e ultrawide.

## Reavaliação contra o estado real

A implementação preserva decisões já consolidadas no projeto:

1. o shell do professor permanece **sem sidebar**, conforme 12.3D.4;
2. `Visão geral` continua sendo o nível global do sistema;
3. `Turma` continua sendo o workspace pedagógico;
4. `Arena` continua sendo operação contextual da sessão;
5. Biblioteca é global ao professor, mas não vira CTA da página de turmas;
6. busca, filtros, ordenação e MRU já existentes foram reaproveitados;
7. `active=false` continua significando turma **inativa**, não “arquivada”.

Nenhuma migration ou nova entidade de domínio foi necessária.

## Implementado

- cabeçalho explícito `Suas turmas` com `+ Nova turma` como única ação primária;
- navegação global agrupada no topbar: `Visão geral` e `Biblioteca`;
- remoção do botão isolado Biblioteca do bloco de ações do header;
- remoção de `Vincular plataforma` da toolbar de descoberta;
- filtros `Todas / Ativas / Inativas` preservados;
- busca por nome/código preservada;
- ordenação por acesso recente, nome e código preservada;
- contagem de resultados e ação `Limpar filtros`;
- empty state específico para busca/filtro sem resultado;
- card compacto com nome, código, alunos, atividades e estado;
- ação principal do card separada do menu contextual;
- grid responsivo com largura máxima de card no desktop;
- tokens semânticos de sombra conectados ao tema;
- estilos novos baseados em `--ds-*`, sem nova paleta paralela.

## Fora do escopo deste MVP

Permanecem sem implementação nesta etapa:

- categorias e tags para turmas;
- novas taxonomias de curso, série ou período;
- carrosséis horizontais de turmas;
- coleções automáticas que dupliquem o mesmo card;
- favoritos e ordenação manual;
- capas personalizadas;
- percentual de progresso sem semântica de domínio definida.

Esses recursos exigem evidência de necessidade antes de ampliar o modelo.

## Critérios de aceite

A consolidação só é considerada válida quando:

- Biblioteca funciona como navegação global e não CTA contextual;
- light e dark preservam contraste e hierarquia;
- não existe overflow horizontal nos viewports-alvo;
- cards não crescem indefinidamente em desktop/ultrawide;
- busca, filtro e abertura de turma permanecem funcionais;
- mobile mantém nomes acessíveis mesmo quando rótulos visuais são ocultos;
- estados vazio, busca vazia e filtro vazio são distinguíveis;
- TypeScript, unit tests, build e E2E permanecem verdes.

A persistência dos filtros em URL foi descartada neste ciclo porque o shell atual usa estado interno de view, não rotas para a Visão geral. Forçar query params exigiria mudar uma decisão arquitetural maior sem benefício proporcional.

## Evidências de validação

Em 03/10/2026, sobre o estado final deste épico:

- `npm run typecheck`: OK;
- suíte unitária frontend: OK;
- build de produção Next.js/Docker: OK;
- `git diff --check`: OK;
- E2E Visão geral: 2/2;
- matriz Visão geral: dark + light em 390, 768, 1024, 1440, 1920 e 2560 px, sempre com reload;
- E2E Home da turma responsiva: 2/2 após correção do overflow compartilhado do topbar;
- fluxo crítico professor → Arena → participante/reconnect: 1/1;
- inspeção visual 1440 px realizada em light e dark.

O E2E detectou durante o desenvolvimento um overflow real em 1024 px na Home de turma. A causa era o contexto longo do breadcrumb concorrendo com a nova navegação global. A correção reduz o breadcrumb em larguras compactas e aplica truncamento sem esconder overflow da página.
