"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchContentLibrary, type LearningResource } from "@/lib/learning-resource-api";
import { linkArenaContextMaterial } from "@/lib/arena-context-material-api";
import { recoveryGuidance } from "@/lib/learning-recovery";
import type { LearningCycleComparison } from "@/lib/learning-cycle-api";
import styles from "./LearningRecoveryPanel.module.css";
import type { Notify } from "@/components/ui";

export default function LearningRecoveryPanel({ sessionId, targetTitle, comparison, notify }: {
  sessionId: string; targetTitle: string; comparison: LearningCycleComparison;
  notify: Notify;
}) {
  const guidance = useMemo(() => recoveryGuidance(comparison), [comparison]);
  const [materials, setMaterials] = useState<LearningResource[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    setMaterials([]);
    if (!targetTitle.trim()) return;
    void fetchContentLibrary({ query: targetTitle.trim() })
      .then((rows) => { if (active) setMaterials(rows.filter((item) => item.libraryVisible && !item.archivedAt).slice(0, 5)); })
      .catch(() => { if (active) setError("Não foi possível buscar materiais. Abra a Biblioteca manualmente."); });
    return () => { active = false; };
  }, [targetTitle]);

  async function attachMaterial(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await linkArenaContextMaterial(sessionId, id);
      window.dispatchEvent(new CustomEvent("arena-context-material-updated", { detail: { sessionId } }));
      notify("Material associado. Abra ‘Material’ no cabeçalho da Arena e conduza a revisão.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível associar o material."); }
    finally { setBusy(false); }
  }

  return (
    <section className={styles.panel} aria-label="Próxima ação pedagógica">
      <h3>{guidance.title}</h3>
      <p>{guidance.explanation}</p>
      <strong>Próximo passo sugerido pelo histórico avaliado</strong>
      <p>{guidance.nextStep}</p>
      <small>Orientação determinística para o professor, não diagnóstico automático nem critério de nota, XP ou mastery.</small>
      {guidance.kind !== "PROGRESS" && guidance.kind !== "MAINTAIN" && (
        <div className={styles.materials}>
          <strong>Materiais relacionados ao objetivo “{targetTitle}”</strong>
          {materials.length ? (
            <ul>
              {materials.map((material) => <li key={material.id}>
                <span>{material.title}</span>
                <button type="button" disabled={busy} onClick={() => { void attachMaterial(material.id); }}>
                  Vincular à Arena
                </button>
              </li>)}
            </ul>
          ) : <p>Nenhum material com título, assunto ou tag correspondente. Você pode selecionar outro pelo botão Material da Arena.</p>}
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </section>
  );
}
