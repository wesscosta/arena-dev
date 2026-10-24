# Arena Dev — P4.1: tempo total por tentativa (PR isolada)

## Escopo e contrato
- Padrão sem limite, preservado para atividades anteriores (migração Flyway V65).
- Docente define 0 (sem limite) ou 1–480 minutos ao criar/editar uma atividade; configuração fica bloqueada após a primeira tentativa.
- No primeiro início da atividade o servidor persiste deadline_at = started_at + time_limit_minutes, sem redefinir em refresh ou novo dispositivo.
- GET da atividade e varredura periódica do servidor (15s, lote até 200) finalizam tentativas vencidas a partir de respostas já persistidas, mantendo o registro e evidência de envio.
- Salvar, remover ou submeter a tentativa não ultrapassam o prazo; gravações tardias recebem conflito controlado. O tempo do navegador serve exclusivamente à exibição: o backend verifica o instante real.
- Cliente mostra tempo restante, lê deadline e tempo servidor, usa relógio monotônico de performance.now() e atualiza a tentativa quando termina. Ao reconciliar a expiração, substitui rascunhos pelas respostas efetivamente salvas e exibe aviso explícito.
- Cópias de atividade herdam a duração; o prazo individual e respostas não são copiados.

## Acessibilidade e limitações importantes
- Não há contagem obrigatória por padrão, pontos por velocidade nem XP associado ao cronômetro.
- Ainda não implementados: extensão/acompanhamento de tempo por aluno, flexibilização formal (WCAG 2.2.1), política por questão, alerta antecipado, cronômetro na área do professor. Portanto atividades cronometradas não devem ser exigidas em contextos que precisem de acomodações até a entrega de extensão e aceite correspondente.
- A expiração só inclui conteúdo persistido; dados não salvos por desconexão não podem ser presumidos como entregues. Ensaiar offline/reconnect e qualidade de mensagens em dispositivos reais.
- Finalização em lote é eventual (até 15s após prazo, sujeita à disponibilidade do servidor) e também ocorre imediatamente quando o aluno consulta ou interage.

## Gates
- Backend: V65, integridade temporal por tentativa, atualização/cópia, bloqueio tardio e varredura, revisão de acesso cruzado, concorrência e idempotência.
- Frontend: contador, 0/sem limite, reflow 320–200%, teclado/VO/Safari/iOS, alertas locais.
- CI: backend, frontend, Compose/Chromium/WebKit. Não contornar billing do GitHub Actions e não autorizar merge enquanto indisponível.
- Campo: professor valida restrições e diferencia tempo total de Timer da Arena; GO/NO-GO v0.11 e Figma-first v0.12 continuam independentes.
