# ADR-0026 — Arena Dev Community sob MIT e produto comercial Verit separado

- **Status:** Aceito
- **Data:** 2026-08-31

## Contexto

O Arena Dev nasceu como projeto público e evoluiu até uma candidata web `0.3.0` com núcleo funcional de turmas, sessões, participação, atividades, pontuação, ranking e mecânicas ao vivo. Esse núcleo tem valor comunitário, educacional e de portfólio quando pode ser estudado, executado e adaptado por terceiros.

Ao mesmo tempo, a evolução para concursos, estudos individuais, organizações e operação SaaS exige módulos comerciais, governança, conteúdo, suporte, privacidade e custos operacionais que não pertencem à baseline Community. Manter tudo no mesmo repositório criaria ambiguidade de licença, titularidade, roadmap e fonte de verdade.

O arquivo `LICENSE` publicado no Arena Dev aplica a licença MIT ao código público distribuído. Uma mudança futura de estratégia não retira retroativamente os direitos já concedidos sobre essas versões.

## Decisão

1. `wesscosta/arena-dev` é o repositório público canônico do **Arena Dev Community**, self-hosted e licenciado sob MIT.
2. O núcleo Community inclui turmas, alunos, sessões, presença, `ScoreEvent`, ranking, atividades, Question Package, importações externas, Sorteio, organização de grupos, Boss Battle, Buzzer e baseline Docker.
3. O produto comercial será criado futuramente em repositório privado sob a organização da Verit, com nome comercial ainda não definido.
4. O repositório comercial pode reutilizar o núcleo MIT desde que preserve o aviso de copyright e a licença do código herdado. Módulos proprietários devem ter licença e avisos próprios, sem afirmar exclusividade sobre o histórico público MIT.
5. Contas persistentes e papéis avançados, organizações, multi-tenancy, planos e billing, Estudos/Concursos, revisão adaptativa, analytics avançado, conteúdo premium, administração institucional, IA e operação SaaS pertencem à fronteira comercial planejada.
6. Arena e Estudos/Concursos permanecem produtos e domínios independentes, com backend e banco separados. Integrações usam APIs ou contratos versionados; não haverá banco compartilhado nem consultas cruzadas como atalho.
7. A mesma pessoa poderá futuramente assumir papéis `STUDENT`, `TEACHER` e `ORGANIZATION_ADMIN`, mas papel, plano e consentimento serão conceitos separados. Somente professor ou instituição cria `Classroom`; aluno pode criar workspace pessoal ou `ChallengeRoom`, não uma turma.
8. O repositório comercial só deve ser aberto após a baseline `v0.3.0` ser encerrada ou após decisão explícita de beta, preservando a rastreabilidade do ponto de origem.
9. Antes de aceitar contribuições externas em escala ou transferir código proprietário à Verit, devem ser formalizados por escrito a política de contribuição e o instrumento de titularidade/licença aplicável. Este ADR não substitui aconselhamento ou documento jurídico.

## Sequência de separação

1. Concluir os gates e publicar a baseline Community `v0.3.0`.
2. Criar o repositório privado comercial na organização da Verit a partir de um commit/tag rastreável.
3. Preservar `LICENSE` para o núcleo MIT e adicionar licença proprietária, `NOTICE` e `THIRD_PARTY_NOTICES` para a distribuição comercial.
4. Implementar os diferenciais comerciais somente no repositório privado.
5. Definir um fluxo explícito para incorporar correções do Community ao produto comercial, sem sincronização bidirecional automática nem vazamento de código proprietário.

## Consequências

- a comunidade recebe uma edição utilizável, auditável e self-hosted com liberdade MIT;
- a Verit pode diferenciar produto, serviço e operação sem tornar ambígua a licença do núcleo público;
- funcionalidades comerciais não devem ser anunciadas como implementadas no Arena Dev Community;
- issues, releases e documentação do repositório público tratam apenas do escopo Community;
- correções de segurança aplicáveis ao núcleo devem ser avaliadas para os dois repositórios;
- a duplicação controlada do núcleo cria custo de sincronização, aceito em troca da separação jurídica, técnica e de produto;
- identidade federada, planos Free/Pro, billing, LGPD, domínio, nome comercial e capacidade de infraestrutura permanecem decisões posteriores.

## Alternativas rejeitadas ou adiadas

- **Fechar ou relicenciar retroativamente o repositório público:** rejeitado; versões já publicadas sob MIT permanecem MIT.
- **Manter Community e comercial no mesmo repositório:** rejeitado por ambiguidade de escopo, licença e operação.
- **Compartilhar banco entre Arena e Estudos:** rejeitado por acoplamento, privacidade e ownership de dados.
- **Criar microserviços, billing ou IA antes da jornada mínima validada:** adiado até evidência de uso recorrente e sinal econômico.
