# Arena Dev — V1

MVP funcional para gamificação de sala de aula em turmas de Desenvolvimento de Sistemas.

## Stack

- Next.js 16.3
- React 19.2
- TypeScript
- CSS próprio (sem biblioteca de UI)
- Persistência local via `localStorage`

## Funcionalidades da V1

- Cadastro e alternância entre turmas
- Cadastro individual de alunos
- Importação em massa por lista de nomes
- Ativar/inativar alunos
- Presença por sessão
- Sorteio inteligente ponderado, priorizando quem foi menos sorteado
- Evita repetição imediata quando há mais de um participante
- XP rápido por resposta, debug e desafio
- Ajuste manual de XP com motivo
- Ranking em tempo real
- Níveis: Aprendiz, Dev Júnior, Dev Pleno, Dev Sênior, Tech Lead e Arquiteto
- Histórico auditável de todos os lançamentos de XP
- Remoção de lançamento incorreto
- Registro em massa de entregas de atividades e bônus por prazo
- Boss Battle com HP
- Geração de duplas/grupos com tentativa de reduzir repetição de combinações
- Backup e restauração em JSON
- Dados de demonstração opcionais
- Layout responsivo

## Como executar

Requisitos: Node.js 20+ (recomendado Node 22).

```bash
npm install
npm run dev
```

Abra:

```text
http://localhost:3000
```

## Persistência

A V1 é **local-first**. Todos os dados ficam no navegador usado pelo professor. Use a tela **Backup** para exportar um JSON regularmente.

Essa decisão é proposital: permite validar o jogo em sala sem depender de servidor, banco, login ou internet. A camada de dados poderá ser substituída depois por PostgreSQL sem alterar as regras centrais do jogo.

## Evolução recomendada

### V1.1
- Editar nome/apelido do aluno
- Editar/excluir turma
- Configurar tabela de XP por turma
- Tela exclusiva para projetor (`/play`)
- Modo tela cheia
- Combos e streaks
- Badges

### V2
- PostgreSQL + Prisma
- Autenticação do professor
- Conta/QR Code do aluno
- Realtime
- Banco de questões e desafios
- PWA

### V3
- Microsoft Graph / Teams
- Importação de turmas e entregas
- Dashboard pedagógico
- Multi-instituição e múltiplos professores

## Observação de privacidade

Nesta V1 nenhum dado é enviado para terceiros pelo aplicativo. Como o armazenamento local pode ser apagado pelo navegador, o backup JSON é parte essencial do fluxo de uso.
