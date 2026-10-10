# ADR-0067 — Publicação segura e versionada de materiais no palco ao vivo (v0.11)

**Status:** Aceito como fundamento técnico para o backend 11.1; extensões de UI, sincronização de seções e retorno ao palco anterior ainda dependem de 11.2/11.3. Revisar evidências de CI antes do merge. **Data:** 10/10/2026.

## Contexto

A v0.10 permite **vincular** material canônico à Arena, mas não projetar o seu conteúdo. O projetor usa código de sessão e snapshot público; o `LiveStage` é mantido no backend e retransmitido por WebSocket. Uma revisão numérica de `LearningResource` não fornece histórico imutável para reabrir conteúdo antigo. O projeto separa Jornada, Atividades e Arena (ADR-0045).

## Decisão proposta

1. A ação explícita **Apresentar material** é diferente de **Vincular material** e de **Projetar janela**.
2. Acrescentar modo `MATERIAL` ao **mesmo LiveStage autoritativo**, com `stageVersion` monotônica e projeções diferenciadas por audiência. Não guardar modo/seção atual como verdade em localStorage.
3. No momento da publicação, persistir `MaterialPublication` com snapshot imutável do texto, estrutura, revisão e hash, limitado à sessão e sem criar outro editor. Corpo somente no endpoint público da publicação **atualmente ativa**, via código válido.
4. Professor controla publicação, salto de seção e retirada mediante autenticação, CSRF e precondição de versão; projetor é apenas leitor. Revogar em encerramento, desvinculação ou perda de elegibilidade editorial.
5. Transmissões enviam metadados, nunca corpo de material ou segredos. Reconexão obtém o estado autoritativo e recarrega conteúdo permitido; comandos repetidos não duplicam efeitos.
6. Exibição não concede XP, Mastery, progresso de Jornada nem conclusão de atividades.

## Consequências e custos

**Benefícios:** previsibilidade após revisão, autorização mínima, capacidade de reconexão e coerência com domínio existente. **Custos:** snapshot armazenado por apresentação, migração aditiva, versão do palco e testes de concorrência/ACL. **Contraexemplos rejeitados:** iframe genérico; leitura pública da Biblioteca; servir conteúdo somente por `resourceId + revision` sem armazenamento histórico; estado concorrente no navegador.

## Pendências deliberadas para M1

Definir tamanho máximo com medição, semântica exata dos códigos de erro, idempotência `NAVIGATE` e política de retenção; todas sem ampliar audiência pública ou relaxar revogação. Contrato e testes: `docs/v0.11/11.0_CONTRATOS_PROJECAO.md` e `11.0_PERMISSOES_AMENACAS.md`.

## Escopo excluído

Multi-tenant/SaaS; HTML executável, iframe/Canva, sincronização pixel a pixel, geração IA automática, exposição da Biblioteca por código, Mastery e banco de questões completo.
