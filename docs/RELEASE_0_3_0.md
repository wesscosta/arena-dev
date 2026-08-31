# Release candidate `v0.3.0`

**Estado:** candidata preparada pelo Incremento 11.4D; tag e GitHub Release ainda não criadas.

**Versão dos manifests:** `0.3.0` no Maven, npm e lockfile.

**Regra de publicação:** a tag só pode ser criada a partir de `main` limpa e sincronizada, no mesmo commit aprovado pelo CI remoto e pelo gate final de release.

## Escopo consolidado

A candidata `v0.3.0` congela o MVP web do Arena Dev após:

- migração dos domínios operacionais para Spring Boot/PostgreSQL;
- segurança administrativa por sessão HTTP e CSRF;
- join temporário e Buzzer autoritativo;
- testes unitários, de integração, transacionais e de concorrência;
- testes frontend, TypeScript e build de produção;
- fluxo crítico Playwright com reconexão;
- CI, containers não-root, healthchecks e baseline de produção.

Não pertencem a esta release autenticação institucional, tela dedicada de projetor, PWA, rate limit distribuído, timer sincronizado ou respostas móveis além do Buzzer.

## Estado dos gates

| Gate | Estado em 31/08/2026 |
| --- | --- |
| Backend e Flyway `V1–V6` | Validado localmente: 14 testes, zero falhas |
| Frontend | Validado localmente: 12 testes, TypeScript e build |
| Playwright | Validado localmente em Chromium |
| Dependências de produção | Validado localmente: auditoria npm sem vulnerabilidades conhecidas |
| Compose e imagens endurecidas | Validado localmente; serviços saudáveis e usuários não-root |
| GitHub Actions | Execuções `33388090556` no SHA `4fd6b236...` e `33402409771` no SHA `dbedac465...` aprovadas; o SHA final após documentação/correção ainda exige execução própria |
| Backup/restore | Dump real e checksum criados em 31/08/2026; correção de compatibilidade do verificador com PostgreSQL 17 incluída nesta consolidação; restauração isolada ainda deve ser reexecutada |
| Rollback | Procedimento documentado; simulação operacional ainda pendente |
| Licença | Validada: MIT; arquivo `LICENSE` integrado no commit `dbedac46519fb8be1e03c6c687e35a6b92c4c2c1` |
| Commit final | Pendente até esta consolidação documental estar na `main`, limpa, sincronizada e aprovada pelo CI |

## Comandos do gate

### 1. Validar metadados

```bash
scripts/release/check-metadata.sh
```

### 2. Executar todos os gates técnicos locais

O comando usa um banco descartável e recusa executar se os nomes fixos dos containers de desenvolvimento já existirem. Assim, ele não remove silenciosamente um volume de trabalho.

```bash
scripts/release/release-gate.sh local
```

A evidência é gravada em `release-evidence/`, diretório ignorado pelo Git.

### 3. Criar e verificar o backup

Com o Compose que contém os dados reais em execução:

```bash
BACKUP_FILE="$(scripts/release/backup-postgres.sh)"
scripts/release/verify-backup.sh "$BACKUP_FILE"
```

O backup usa `pg_dump` no formato custom e recebe checksum SHA-256. A verificação restaura o arquivo em um PostgreSQL 17 temporário, confirma seis migrations Flyway bem-sucedidas e verifica as tabelas centrais.

### 4. Registrar e confirmar o CI remoto

```bash
gh run list --workflow CI --branch main --limit 5
gh run watch ID_DA_EXECUCAO --exit-status
gh run view ID_DA_EXECUCAO --json url,headSha,status,conclusion
```

O `headSha` aprovado deve ser exatamente o commit que receberá a tag.

### 5. Executar o gate final

```bash
scripts/release/release-gate.sh final \
  --ci-run-url https://github.com/wesscosta/arena-dev/actions/runs/ID_DA_EXECUCAO \
  --backup "$BACKUP_FILE"
```

O modo `final` também exige:

- branch `main`;
- árvore de trabalho limpa;
- `HEAD` igual ao upstream;
- arquivo de licença presente;
- CI remoto concluído com sucesso no mesmo SHA;
- backup restaurável;
- repetição dos gates backend, frontend, Compose, imagens e E2E.

## Checklist antes da tag

- [x] versões Maven/npm/lockfile alinhadas em `0.3.0`;
- [x] gate local automatizado e evidência reproduzível;
- [x] backup, verificação e restauração operacionalizados por scripts;
- [x] fronteira de rollback documentada;
- [x] licença MIT escolhida e arquivo `LICENSE` adicionado;
- [ ] `main` limpa e sincronizada com `origin/main`;
- [ ] commit final registrado;
- [ ] CI remoto verde no mesmo commit;
- [ ] backup real criado e restaurado no verificador;
- [ ] rollback simulado no ambiente-alvo;
- [ ] proxy TLS e secrets do ambiente-alvo validados;
- [ ] gate `final` concluído sem falhas;
- [ ] tag anotada e notas publicadas.

## Criação da tag

Somente depois de todos os itens anteriores:

```bash
git tag -a v0.3.0 -m "Arena Dev v0.3.0"
git push origin v0.3.0

gh release create v0.3.0 \
  --repo wesscosta/arena-dev \
  --title "Arena Dev v0.3.0" \
  --notes-file docs/RELEASE_0_3_0.md
```

`v0.1-legacy`, `v0.2.0` e `v0.2.1` pertencem à aplicação desktop legada. Elas não são alvos compatíveis para rollback do Arena Dev web.

## Estratégia de rollback

### Falha somente na aplicação

1. interromper a exposição pública no proxy;
2. preservar logs, commit, digest/tag das imagens e horário do incidente;
3. redeployar o último commit/imagem web conhecido como funcional;
4. manter o PostgreSQL intacto quando não houver evidência de corrupção;
5. executar healthchecks e um smoke test antes de reabrir o tráfego.

O Incremento 11.4 não adiciona migration após a `V6`; portanto, o rollback de aplicação desta fatia não exige downgrade do schema.

### Corrupção ou restauração de dados

Restauração de banco é uma ação separada e destrutiva. O script exige confirmação explícita, valida o dump antes da troca, para as aplicações e cria um backup de segurança do banco corrente.

```bash
scripts/release/restore-postgres.sh "$BACKUP_FILE" --confirm-replace
```

Se a restauração falhar, backend e frontend permanecem parados e o backup de segurança é informado. Não execute restauração apenas para reverter código.

### Limite operacional

O repositório fornece a baseline de containers, não uma plataforma de deploy completa. TLS, proxy reverso, DNS, armazenamento externo dos backups, retenção, monitoramento e rotação de secrets pertencem ao ambiente-alvo e precisam de validação própria.

As imagens-base ainda usam tags versionadas por linha, não digests imutáveis. O commit/tag reproduz a configuração e o código, mas uma reconstrução futura pode receber uma revisão diferente da mesma imagem-base. Os digests efetivamente publicados devem ser registrados nas notas operacionais da release.

## Decisão da versão

- `v0.3.0` é a próxima candidata estável do Arena Dev web;
- `v0.3.0-beta.1` só deve ser usada se for necessário publicar um snapshot antes dos gates finais;
- `v1.0.0` permanece adiada até validação funcional e operacional mais ampla;
- nenhuma tag é criada pelo script para impedir publicação acidental.
