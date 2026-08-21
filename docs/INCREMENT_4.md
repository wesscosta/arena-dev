# Incremento 4 — Turmas, Alunos e Matrículas via API

**Status:** implementado.

Este incremento move o primeiro domínio funcional do frontend local-first para a arquitetura persistente definida no Incremento 1, sem redesenhar a interface.

## Escopo migrado

O backend/PostgreSQL passa a ser a fonte de verdade de:

- `Classroom`;
- `Student`;
- `Enrollment`.

Continuam temporariamente local-first:

- `GameSession` e presença;
- `Activity` e questões;
- `ScoreEvent`/XP e ranking;
- Arena e sorteio;
- Boss Battle;
- grupos e histórico de combinações.

## Frontend

Foi criado `frontend/lib/classroom-api.ts` para concentrar os contratos REST e impedir chamadas `fetch` espalhadas nos componentes.

Na inicialização, o frontend:

1. carrega somente os módulos ainda locais;
2. consulta turmas e alunos no backend;
3. consulta matrículas de cada turma;
4. combina os dois estados em memória;
5. usa IDs UUID emitidos pelo backend em todas as novas atividades/sessões/eventos locais.

`localStorage` deixa de persistir cópias autoritativas de turmas, alunos e matrículas.

## Operações migradas

A tela existente de **Turma e alunos** foi preservada, mas agora executa:

- criar turma → `POST /api/classrooms`;
- cadastrar aluno → `POST /api/students`;
- vincular aluno → `POST /api/classrooms/{classroomId}/students/{studentId}`;
- ativar/inativar matrícula → `PATCH /api/classrooms/{classroomId}/students/{studentId}`;
- remover vínculo → `DELETE /api/classrooms/{classroomId}/students/{studentId}`;
- listar estado → `GET` na API.

Depois de cada mutação, o frontend recarrega o domínio persistente. Não há contador ou lista paralela autoritativa no navegador.

## Fronteira limpa de migração

Os incrementos 1–3 foram usados como ambiente de validação e continham IDs locais incompatíveis com os UUIDs do backend. Foi decidido **não criar uma camada temporária de remapeamento desses dados experimentais**.

Se o `localStorage` antigo ainda contiver turmas/alunos/matrículas, o Incremento 4 inicia os módulos locais vazios. Isso evita atividades, sessões e ScoreEvents órfãos ligados a IDs que não existem no PostgreSQL.

Para uma validação completamente limpa, é permitido apagar também o volume PostgreSQL antes de subir esta versão:

```bash
docker compose down -v
docker compose up -d --build
```

Essa limpeza é aceitável apenas nesta fase de desenvolvimento. Depois que dados reais forem considerados duráveis, migrations e procedimentos de upgrade não poderão depender de reset destrutivo.

## Backup durante a transição

- exportar gera um snapshot do estado atual;
- importar restaura somente sessões, XP, atividades e grupos compatíveis com os IDs existentes no backend;
- turmas/alunos/matrículas de um JSON não sobrescrevem o PostgreSQL;
- o ambiente de demonstração agora cria turma e alunos pela API.

## Estado visual

A baseline de UX permanece preservada. A única mudança informativa é o rodapé lateral, que passa a indicar **Persistência híbrida** enquanto houver domínios local-first.

## Critérios de validação

- [ ] criar uma turma e recarregar a página: a turma continua disponível;
- [ ] criar alunos e recarregar: alunos e matrículas continuam disponíveis;
- [ ] inativar/reativar aluno e recarregar: estado é preservado;
- [ ] remover aluno da turma e recarregar: vínculo não reaparece;
- [ ] trocar entre duas turmas: alunos corretos são carregados;
- [ ] criar atividade/Arena após a migração: IDs da turma e dos alunos são UUIDs do backend;
- [ ] desligar o backend: UI informa indisponibilidade em vez de fingir persistência local;
- [ ] frontend compila sem erros TypeScript.

## Próximo incremento

Migrar `ClassSession` e `SessionParticipant` (início/fim de sessão e presença) para REST/PostgreSQL, preservando Arena, atividades e demais mecânicas ainda local-first.

## Correção de inicialização — Spring Boot 4 + Flyway

Durante a validação em ambiente Docker com banco zerado, o Hibernate iniciou com `ddl-auto: validate` antes de qualquer migração e encerrou por ausência de `class_sessions`.

A causa foi a modularização do Flyway no Spring Boot 4: o projeto usava `flyway-core` diretamente, sem o starter de integração do Spring Boot. A correção substitui essa dependência por `spring-boot-starter-flyway`, mantendo `flyway-database-postgresql`, e explicita `classpath:db/migration`.

O Compose também passa a aguardar a cadeia de saúde: `PostgreSQL healthy → backend /api/health healthy → frontend`.
