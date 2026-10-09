# v0.10 — Aceite operacional e limites de implantação

**Estado: NO-GO para publicação ampla.** Candidata `0.10.0-rc.1` em `feat/v0.10-learning-loop`. Este documento é roteiro de aceite, não evidência de execução dos testes físicos.

## Escopo permitido

- Uma conta docente autenticada por implantação self-hosted, conforme [ADR-0053](../adr/ADR-0053-single-operator-teacher-security-boundary.md). Não anunciar contas independentes, tenant isolation nem SaaS multi-docente.
- Não incorporar Canva em iframe no cockpit: material externo pode ser associado como LINK HTTPS existente; a Biblioteca continua sendo a fonte canônica, sem duplicação do conteúdo.
- Não atribuir mastery longitudinal a comparação de uma verificação nem pontuar automaticamente autoconfiança.

## Procedimento de homologação presencial (registrar data, dispositivo, versão, responsável, resultado e evidências)

1. **PWA v0.9 previamente instalada:** abrir v0.9 em Android/Chrome e iOS/Safari, iniciar atividade e só então atualizar o servidor para v0.10 em ambiente de homologação. Confirmar que não houve reload forçado, conteúdo inesperado ou resposta duplicada; retomar online, entrar novamente e verificar gabarito e token. Repetir com aplicativo em segundo plano.
2. **Rede intermitente:** simular perda antes do comando e perda da resposta após persistência de sorteio/XP; checar que o docente recebe estado incerto e só realiza GET de reconciliação antes de novo POST. Validar ledger e ausência de duplicatas no backend. Repetir para Learning Check com aluno e projetor ativos simultaneamente.
3. **Acessibilidade:** percorrer sem mouse (Tab, Shift+Tab, Escape), verificar retorno do foco nos dois diálogos, testar zoom 200%, 300%, 400%, contraste claro/escuro e leitura NVDA ou VoiceOver; registrar violação e severidade por rota/viewport. Não confundir axe A/AA com AAA.
4. **Roteiro pedagógico:** executar diagnóstico → discussão em pares → nova verificação → Clínica do Erro → material contextual → evidências; aferir clareza da sequência e distinguir ausência de resposta, erro persistente, melhoria no instrumento e resultado longitudinal. Registrar dados anonimizados e feedback do docente.
5. **Rollback operacional:** programar janela, backup consistente pré-upgrade + checksum e teste de restore, anotar RTO/RPO admissíveis, gravar dados na v0.10 de homologação e medir perda ao restaurar o snapshot V48 anterior ao upgrade. Confirmar clientes/cache, reconexão, rotas, observabilidade e plano de comunicação. Nunca executar rollback destrutivo sobre dados de produção sem autorização.

## Critérios de interrupção e decisão

**NO-GO** se: houver duplicação/perda não explicada de XP ou evidências, vazamento de gabarito, falha de autenticação/autorização, regressão de PWA instalada, controles críticos inacessíveis por teclado, restore não verificável, RPO/RTO não aceitos ou CI sem sucesso no SHA candidato.

**GO restrito** exige: CI verde no SHA exato, evidência dos cinco ensaios, revisão de segurança/dependências, operador único explicitamente aceito, README/release notes/monitoramento atualizados, aprovação do PR e registro de responsável pela decisão. Depois disso: estabilizar versão, rodar gate final na `main`, criar tag e liberar conforme janela aprovada. A release não deve ser promovida por inferência a partir de testes sintéticos.

## Modelo de registro

| Gate | Data/ambiente | Responsável | Resultado | Evidência | Bloqueio/ação |
|---|---|---|---|---|---|
| PWA instalada Android/iOS | Pendente | — | NÃO EXECUTADO | — | Homologar |
| Rede real e idempotência | Pendente | — | NÃO EXECUTADO | — | Homologar |
| Teclado/leitor de tela/zoom | Pendente | — | NÃO EXECUTADO | — | Homologar |
| Aula piloto | Pendente | — | NÃO EXECUTADO | — | Homologar |
| Rollback com RTO/RPO | Pendente | — | NÃO EXECUTADO | — | Homologar |
