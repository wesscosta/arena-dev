# Referências e critérios de adoção · Ramuvi

Referências estudadas em **13/10/2026** pelo conteúdo de seus repositórios GitHub. Esta integração é uma **síntese autoral** das abordagens, não um espelhamento dos pacotes, hooks ou executáveis de terceiros. Nenhuma instalação ou execução de script externo foi necessária.

| Origem | Licença encontrada | Elementos extraídos | Restrições de adoção |
|---|---|---|---|
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT © 2026 Emil Kowalski | `emil-design-eng`, `mobile-native`, `break-ui` — motion responsivo, feedback, safe areas e casos extremos | Não copiar timings cegamente; decisões pedagógicas e `reduced-motion` prevalecem |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Apache-2.0; verificar NOTICE antes de distribuir conteúdo do upstream | `skill/SKILL.md` e fluxo `shape → critique → audit → polish → harden` | Não instalar hooks binários automaticamente; não substituir contratos existentes por padrões estéticos |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | MIT © 2026 Leonxlnx | `redesign-skill` e análises das variantes `minimalist-skill` e `soft-skill` | O preset principal foca landing pages; proibições universais de fontes, ícones e motion conflitam com branding e acessibilidade da Ramuvi |

## Deliberação crítica

1. A **Ramuvi** não é portfólio nem site de marketing: no painel docente, economia cognitiva e rapidez predominam sobre cenas heroicas cinematográficas.
2. Em uso de projetor e na Arena, animações mais fortes podem reduzir inteligibilidade. A ausência de movimento pode ser a opção correta.
3. Presets de fonte como Geist/Inter ou cores genéricas de SaaS não substituem a identidade C4.2–R1 com Manrope e a paleta definida.
4. "Todas as telas em cards", cards aninhados, sombras constantes e ícones arbitrários tornam a UI previsível e aumentam ruído.
5. Priorizar alteração do token semântico reduz divergências e facilita rollback; reescrita total de CSS/JSX cria risco desnecessário.
6. A baseline visual é candidata à homologação, não uma decisão jurídica nem uma prova de distintividade validada.

## Direitos e rastreabilidade

Os repositórios upstream mantêm direitos e licenças próprios. Este projeto não redistribui código-fonte nem transcreve skills integrais de terceiros. Links permitem consultar a versão original. Caso ocorra incorporação de arquivos upstream no futuro, incluir respectiva licença e atribuições exigidas.

A fonte **Manrope** é distribuída sob SIL Open Font License 1.1; texto original da licença em `frontend/public/fonts/OFL-Manrope.txt`.

## Recomendações de atualização

Avaliar atualizações upstream de maneira seletiva (diferenças em `SKILL.md` e licenças), revisar segurança de scripts e documentar se algum comando binário vier a ser ativado. A skill própria é `.agents/skills/ramuvi-design-review/SKILL.md`.
