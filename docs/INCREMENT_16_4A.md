# 16.4A — Student Workspace Visibility

**Status:** implementado em 28/09/2026.

## Decisão de domínio

Matrícula continua representando pertencimento à turma. Ela não publica automaticamente o conteúdo no espaço persistente do aluno.

A Study API autoriza estudo somente com matrícula ativa, acesso de estudo da turma habilitado e Journey publicada.

O fluxo de entrada, QR, sessão ao vivo, Arena e a área ao vivo do aluno não consultam essa política.
## Implementação

- Migration V34 adiciona student_study_access_enabled com default false.
- Classroom expõe a política pelo contrato de atualização já existente.
- StudyAccessPolicy centraliza a autorização; não foi criada ACL genérica.
- A listagem agrega matrículas ativas do mesmo Student e filtra turmas liberadas.
- Acesso direto à Journey, leitura de conteúdo e comandos de progresso passam pela mesma policy.
- A matrícula correta é resolvida pela turma da Journey, removendo o acoplamento indevido do estudo multi-turma à matrícula que originou o device claim.
- A tela de configurações da turma ganhou o controle Espaço de estudo com feedback não destrutivo.
- Desabilitar acesso não remove progresso, matrícula, Journey ou LearningResource.

## Validação

Backend: suíte Maven passou; JourneyCoreIT cobre default OFF, duas turmas, ocultação, bloqueio de acesso direto e retomada do mesmo progresso após reativação.

Frontend: o gate integrado corrente da branch está em 268 testes, typecheck e build de produção aprovados.

A validação visual manual em navegador continua sendo um gate operacional antes de considerar o incremento encerrado em release.

## Fechamento do ciclo

Integrado ao checkpoint do Student Experience em 28/09/2026. O comportamento default OFF, a política centralizada e a resolução multi-turma permanecem decisões vinculantes. Ver [`CLOSURE_16_4_STUDENT_EXPERIENCE.md`](CLOSURE_16_4_STUDENT_EXPERIENCE.md).
