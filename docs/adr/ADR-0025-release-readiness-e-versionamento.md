# ADR-0025 — Release readiness e versionamento `0.3.x`

- **Status:** Aceito
- **Data:** 2026-08-31

## Contexto

Os Incrementos 11.3 e 11.4A–11.4C criaram testes automatizados, E2E, CI e uma baseline de produção. Ainda faltava uma fronteira operacional que impedisse a criação de uma tag baseada apenas em documentação ou em um diretório local não reproduzível.

As tags `v0.1-legacy`, `v0.2.0` e `v0.2.1` pertencem à aplicação desktop anterior e não representam uma cadeia de rollback compatível com o Arena Dev web.

## Decisão

1. A próxima candidata estável do Arena Dev web usa a série `0.3.x`; os manifests são alinhados em `0.3.0` antes da tag.
2. A tag `v0.3.0` só pode apontar para uma `main` limpa, sincronizada e aprovada pelo GitHub Actions no mesmo SHA.
3. O gate final exige licença definida, backup PostgreSQL restaurável, evidência de CI e repetição dos gates técnicos locais.
4. A tag e a GitHub Release permanecem ações manuais e explícitas; nenhum script do repositório as cria automaticamente.
5. Rollback de aplicação e restauração de dados são procedimentos distintos. Código deve voltar para o último artefato web conhecido como funcional sem restaurar o banco por padrão.
6. Uma restauração de banco exige confirmação explícita, verificação prévia do dump e backup de segurança do estado substituído.
7. O overlay de produção continua dependendo de proxy TLS, DNS, secrets e armazenamento de backup externos ao repositório.

## Consequências

- `v1.0.0` permanece adiada;
- a ausência de licença ou de CI remoto verde bloqueia a release pública, mas não impede validar a candidata localmente;
- a primeira release web não usa tags legadas como destino de rollback;
- evidências locais são preservadas fora do Git em `release-evidence/` e backups em `backups/`;
- a operação ganha procedimentos reproduzíveis, mas deploy, proxy, monitoramento e retenção continuam dependentes do ambiente-alvo.
