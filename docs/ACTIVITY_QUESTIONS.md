# Atividades e questões — contrato V1

## Objetivo

As questões pertencem à **Atividade**. O Arena Dev não exige um banco de questões separado para que o professor prepare uma aula.

Fluxo principal:

```text
Atividade
  ├── dados e XP
  ├── recurso externo opcional
  └── questões
       ├── criar manualmente
       ├── importar JSON
       └── gerar prompt para IA
```

A geração com IA é **provider-agnostic**: o Arena Dev monta um prompt e o professor pode colá-lo na IA de sua preferência. Não há chave de API nem custo de tokens dentro da aplicação neste incremento.

## Tipos suportados

- `MULTIPLE_CHOICE` — múltipla escolha com exatamente 4 alternativas e uma correta;
- `OPEN` — resposta aberta;
- `TRUE_FALSE` — verdadeiro/falso;
- `BUG_FIX` — análise e correção de erro, com código quando aplicável;
- `ANALYSIS` — análise/interpretação de informação, código, situação, tabela ou evidência textual;
- `PRACTICAL` — tarefa prática com resultado esperado e critérios;
- `SCENARIO` — situação-problema contextualizada.

Dificuldades:

- `EASY`
- `INTERMEDIATE`
- `HARD`

## Pacote JSON

Versão atual: `1.0`.

```json
{
  "version": "1.0",
  "activity": {
    "title": "Revisão de DHCP",
    "topic": "DHCP",
    "difficulty": "INTERMEDIATE"
  },
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "statement": "Qual serviço atribui automaticamente configurações IP aos clientes?",
      "difficulty": "EASY",
      "points": 3,
      "options": [
        { "id": "A", "text": "DNS" },
        { "id": "B", "text": "DHCP" },
        { "id": "C", "text": "HTTP" },
        { "id": "D", "text": "SSH" }
      ],
      "answer": "B",
      "explanation": "DHCP distribui parâmetros de rede automaticamente aos clientes."
    }
  ]
}
```

O importador valida o formato antes de adicionar qualquer questão.

## Campos por tipo

Campos comuns:

- `type`
- `statement`
- `difficulty`
- `points`

Campos opcionais/conforme o tipo:

- `options`
- `answer`
- `expectedAnswer`
- `explanation`
- `code`
- `language`
- `expectedOutcome`
- `evaluationCriteria`

## Gerador de prompt

O formulário solicita somente:

- tema;
- nível predominante;
- objetivo/contexto opcional;
- quantidade por tipo de questão;
- orientações adicionais opcionais.

Presets iniciais:

- Revisão;
- Diagnóstico;
- Prática;
- Personalizado.

O sistema recomenda pacotes de 6–10 questões para atividades rápidas e apenas alerta, sem bloquear, quando o total ultrapassa 15 questões.

## Ferramentas externas

Uma atividade pode registrar plataforma e URL externa (por exemplo, Wayground, Forms ou Kahoot). Isso permite manter o Arena Dev como central da aula sem recriar ferramentas especializadas.

A importação automática de relatórios externos **não faz parte deste incremento**. Ela deve entrar posteriormente por adaptadores específicos de arquivo/formato, preservando o domínio do Arena Dev desacoplado de um fornecedor.
