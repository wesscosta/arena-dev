# ADR-0028 — Preferred name por matrícula e identidade opaca de dispositivo

- **Status:** Aceito
- **Data:** 2026-09-08
- **Escopo:** domínio, identidade, privacidade, UX do participante
- **Implementação:** concluída localmente em 12.4D.0C/0D; Poll já consome a separação de identidade em 12.4D.1

## Contexto

O aluno não deve precisar se identificar do zero em toda aula, mas persistir nome/apelido ou participant token indefinidamente no browser criaria uma fonte de identidade fora do domínio e misturaria identidade de dispositivo com autenticação da sessão.

Além disso, o nome usado em uma turma pode não ser a melhor representação pública da identidade canônica do estudante.

## Decisão

Separar quatro conceitos:

```text
Student
└── identidade canônica

Enrollment
└── preferredName da pessoa naquela turma

Device claim
└── identificador opaco relativamente persistente

Participant token
└── credencial temporária da sessão atual
```

`preferredName` pertence a `Enrollment`, não ao cookie e não necessariamente a `Student`.

O backend resolve um `displayName` adequado para cada superfície. Clientes públicos recebem `displayName`, em vez de receber nome completo + apelido + flags e decidir localmente o que expor.

O browser poderá armazenar um identificador opaco para reconhecimento do dispositivo. Esse valor não contém “Jota”, matrícula ou outro dado de negócio. O servidor relaciona o claim à identidade/matrícula permitida.

O participant token continua temporário e expira com a participação/sessão; reconhecer o dispositivo não equivale a manter uma sessão de aula autenticada indefinidamente.

## Política de exibição

A implementação deve suportar política equivalente a:

```text
FULL_NAME
FIRST_NAME
PREFERRED_NAME
FIRST_OR_PREFERRED
ANONYMOUS
```

A política é resolvida no backend conforme o contexto. Não é necessário expor a enum integral em toda API pública se a superfície só precisa do `displayName` já resolvido.

## Consequências

### Positivas

- reduz fricção de reentrada no `/join`;
- mantém identidade canônica separada do nome público;
- evita cookie/localStorage como fonte de domínio;
- permite anonimato real em Poll e nome preferido em Sorteio/ranking público;
- separa persistência do dispositivo da credencial efêmera da aula.

### Custos e riscos

- exige migration para `Enrollment.preferredName` e estrutura de device claim;
- reconhecimento de dispositivo precisa de revogação e tratamento de dispositivos compartilhados;
- políticas de display devem ter defaults seguros.

## Ponte de compatibilidade

`Student.nickname` permanece disponível como fallback legado, mas `Enrollment.preferredName` já é a preferência contextual autoritativa para a turma. A remoção futura do nickname global não é requisito desta decisão.

## Critérios de validação

- [x] `preferredName` persistido em Enrollment;
- [x] payload público recebe `displayName` resolvido;
- [x] device claim persistente não contém identidade legível;
- [x] participant token permanece temporário;
- [x] dispositivo reconhecido ainda exige entrada na sessão atual;
- [x] Poll usa projeção agregada/anônima.

## Relações

- Complementa: ADR-0005, ADR-0017, ADR-0023, ADR-0024, ADR-0027.
