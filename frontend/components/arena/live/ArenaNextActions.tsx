"use client";

import type { ArenaDynamic } from "./ArenaLiveChrome";
import styles from "./ArenaNextActions.module.css";

type Action = { label: string; dynamic?: ArenaDynamic; groups?: boolean };
const SUGGESTIONS: Record<Exclude<ArenaDynamic, "runbook">, Action[]> = {
  draw: [
    { label: "Aplicar uma verificação", dynamic: "learning-check" },
    { label: "Retomar roteiro", dynamic: "runbook" },
  ],
  wordcloud: [
    { label: "Verificar compreensão", dynamic: "learning-check" },
    { label: "Abrir votação", dynamic: "poll" },
  ],
  poll: [
    { label: "Discutir em grupos", groups: true },
    { label: "Aplicar uma verificação", dynamic: "learning-check" },
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
    { label: "Aplicar uma verificação", dynamic: "learning-check" },
    { label: "Retomar roteiro", dynamic: "runbook" },
  ],
  boss: [
    { label: "Aplicar uma verificação", dynamic: "learning-check" },
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
      <details className={styles.details}>
        <summary>
          Próximas ações <span aria-hidden="true">▴</span>
        </summary>
        <div className={styles.menu}>
          <strong>Continuar a aula</strong>
          <p>Escolha uma possibilidade. O roteiro só avança por decisão do professor.</p>
          <div className={styles.actions}>
            {SUGGESTIONS[dynamic].map((item) => (
              <button
                type="button"
                key={item.label}
                onClick={(event) => {
                  const details = event.currentTarget.closest("details");
                  if (details) details.open = false;
                  if (item.groups) onOpenGroups();
                  else if (item.dynamic) onSelectDynamic(item.dynamic);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </details>
    </nav>
  );
}
