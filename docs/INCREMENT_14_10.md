
# Incremento 14.10 — Preparação para integração Teams

## Objetivo
Preparar o domínio para Microsoft Teams e outros providers sem acoplar `ActivitySubmission` a um fornecedor.

## V25
Cria `activity_provider_links` e `submission_provider_links` para preservar identificadores externos e estado de sincronização.

## Fronteira
`LearningPlatformGateway` define as futuras operações de importação de submissões e publicação de feedback. Nenhum adapter concreto é ativado neste incremento.

## Regras
- `ActivitySubmission` continua sendo a fonte normalizada.
- `SubmissionSource` continua registrando ARENA/TEAMS/GOOGLE_CLASSROOM/IMPORT.
- tokens OAuth não são persistidos nessas tabelas.
- rascunhos, notas privadas e sugestões da IA nunca são exportáveis.
- apenas `publishedFeedback` pode ser preparado para sincronização futura.

## UI
O dashboard mostra o estado de prontidão de Teams e Google Classroom sem sugerir que a integração já está conectada.

## Próximo
14.11 — Hardening, E2E e release gate da v0.6.0.
