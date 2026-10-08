"use client";

import type { ArenaDynamic } from "./ArenaLiveChrome";
import styles from "./ArenaNextActions.module.css";

type Action = { label: string; dynamic?: ArenaDynamic; groups?: boolean };
const SUGGESTIONS: Record<Exclude<ArenaDynamic, "runbook">, Action[]> = {
  draw: [
    { label: "Verificar aprendizagem", dynamic: "learning-check" },
    { label: "Retomar roteiro", dynamic: "runbook" },
  ],
  wordcloud: [
    { label: "Verificar compreensão", dynamic: "learning-check" },
    { label: "Abrir votação", dynamic: "poll" },
  ],
  poll: [
    { label: "Discutir em grupos", groups: true },
    { label: "Verificar aprendizagem", dynamic: "learning-check" },
  ],
  quiz: [
    { label: "Aprofundar por objetivo", dynamic: "learning-check" },
    { label: "Retomar roteiro", dynamic: "runbook" },
  ],
  "learning-check": [
    { label: "Organizar discussão", groups: true },
    { label: "Retomar roteiro", dynamic: "runbook" },
  ],
  buzzer: [
    { label: "Verificar aprendizagem", dynamic: "learning-check" },
    { label: "Retomar roteiro", dynamic: "runbook" },
  ],
  boss: [
    { label: "Verificar aprendizagem", dynamic: "learning-check" },
    { label: "Retomar roteiro", dynamic: "runbook" },
  ],
};

export default function ArenaNextActions({
  dynamic,
  onSelectDynamic,
  onOpenGroups,
}: {
  dynamic: ArenaDynamic;
  onSelectDynamic: (dynamic: ArenaDynamic) => void;
  onOpenGroups: () => void;
}) {
  if (dynamic === "runbook") return null;
  return (
    <nav className={styles.panel} aria-label="Sugestões para continuar a aula">
      <div>
        <strong>Continuar a aula</strong>
        <span>Próximas ações sugeridas. O professor decide quando avançar.</span>
      </div>
      <div className={styles.actions}>
        {SUGGESTIONS[dynamic].map((item) => (
          <button
            type="button"
            key={item.label}
            onClick={() =>
              item.groups ? onOpenGroups() : item.dynamic && onSelectDynamic(item.dynamic)
            }
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
