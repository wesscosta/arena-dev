"use client";

import ArenaToolDrawer from "@/components/ArenaToolDrawer";
import { RadioCard } from "@/components/ui";
import styles from "./DrawSettingsDrawer.module.css";
import type { ParticipantSelectorMode } from "./selection.types";
import type { DrawPolicy } from "@/lib/draw-api";

type DrawSettingsDrawerProps = {
  open: boolean;
  mode: ParticipantSelectorMode;
  busy: boolean;
  policy: DrawPolicy;
  policyLocked: boolean;
  onPolicyChange: (policy: DrawPolicy) => void;
  onClose: () => void;
  onPresentationChange: (mode: ParticipantSelectorMode) => void;
};

export default function DrawSettingsDrawer({
  open,
  mode,
  busy,
  policy,
  policyLocked,
  onPolicyChange,
  onClose,
  onPresentationChange,
}: DrawSettingsDrawerProps) {
  return (
    <ArenaToolDrawer
      open={open}
      title="Configurações do Sorteio"
      subtitle="Escolha como chamar participantes e como apresentar o resultado."
      onClose={onClose}
    >
      <div className={styles.panel}>
        <section className={styles.section}>
          <span className={styles.label}>CRITÉRIO DE SELEÇÃO</span>
          <div className={styles.choiceList} role="radiogroup" aria-label="Critério de sorteio">
            <RadioCard name="draw-policy" value="ROUND_ROBIN_SHUFFLED"
              checked={policy === "ROUND_ROBIN_SHUFFLED"} disabled={busy || policyLocked}
              label="Rodada completa (recomendado)"
              description="Chama todos os presentes antes de repetir alguém. Passar a vez conta como chamado; anular não conta."
              onChange={() => onPolicyChange("ROUND_ROBIN_SHUFFLED")} />
            <RadioCard name="draw-policy" value="BALANCED_WEIGHTED"
              checked={policy === "BALANCED_WEIGHTED"} disabled={busy || policyLocked}
              label="Balanceado"
              description="Prioriza quem foi menos chamado, mas pode repetir antes de todos participarem."
              onChange={() => onPolicyChange("BALANCED_WEIGHTED")} />
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.label}>APRESENTAÇÃO</span>
          <div
            className={styles.choiceList}
            role="radiogroup"
            aria-label="Apresentação do sorteio"
          >
            <RadioCard
              name="draw-presentation"
              value="grid-spotlight"
              checked={mode === "grid-spotlight"}
              disabled={busy}
              label="Grid + Spotlight"
              description="Mostra a turma em cards e destaca apenas o participante sorteado."
              onChange={() => onPresentationChange("grid-spotlight")}
            />
            <RadioCard
              name="draw-presentation"
              value="wheel"
              checked={mode === "wheel"}
              disabled={busy}
              label="Roleta"
              description="Altera somente a apresentação visual, preservando o critério de seleção escolhido."
              onChange={() => onPresentationChange("wheel")}
            />
          </div>
          <p className={styles.persistenceNote}>
            A apresentação escolhida fica salva nesta sessão.
          </p>
        </section>

        <section className={styles.section}>
          <span className={styles.label}>REGRAS DA SELEÇÃO</span>
          <div className={styles.rule}>
            <span className={styles.ruleIcon} aria-hidden="true">✓</span>
            <div>
              <strong>Apenas presentes</strong>
              <p>Somente alunos marcados como presentes entram no sorteio.</p>
            </div>
          </div>
          <div className={styles.rule}>
            <span className={styles.ruleIcon} aria-hidden="true">✓</span>
            <div>
              <strong>Evita repetição imediata</strong>
              <p>
                Rodada completa evita repetição até chamar todos. No balanceado, a última pessoa é excluída da próxima seleção quando possível.
              </p>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.explainer}`}>
          <strong>Seleção não é participação</strong>
          <p>Após cada sorteio, confirme participação, pontue se necessário, passe a vez ou anule.
          Grid e Roleta não alteram o critério escolhido.</p>
        </section>
      </div>
    </ArenaToolDrawer>
  );
}
