"use client";

import ArenaToolDrawer from "@/components/ArenaToolDrawer";
import { RadioCard } from "@/components/ui";
import styles from "./DrawSettingsDrawer.module.css";
import type { ParticipantSelectorMode } from "./selection.types";

type DrawSettingsDrawerProps = {
  open: boolean;
  mode: ParticipantSelectorMode;
  busy: boolean;
  onClose: () => void;
  onPresentationChange: (mode: ParticipantSelectorMode) => void;
};

export default function DrawSettingsDrawer({
  open,
  mode,
  busy,
  onClose,
  onPresentationChange,
}: DrawSettingsDrawerProps) {
  return (
    <ArenaToolDrawer
      open={open}
      title="Configurações do Sorteio"
      subtitle="Defina a apresentação sem alterar as regras de seleção da turma."
      onClose={onClose}
    >
      <div className={styles.panel}>
        <section className={styles.section}>
          <span className={styles.label}>CRITÉRIO DE SELEÇÃO</span>
          <div className={styles.modeCard}>
            <span className={styles.modeIndicator} aria-hidden="true" />
            <div>
              <strong>Balanceado</strong>
              <p>Prioriza quem foi sorteado menos vezes durante a sessão.</p>
            </div>
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
              description="Mantém a seleção balanceada e altera somente a apresentação visual."
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
                Quando há mais de um participante, o último sorteado não é escolhido novamente na rodada seguinte.
              </p>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.explainer}`}>
          <strong>Como o balanceamento funciona</strong>
          <p>
            Todos continuam com chance de serem sorteados, mas o peso aumenta para quem participou menos.
            A apresentação não altera o resultado: a decisão final continua sendo feita pelo servidor.
          </p>
        </section>
      </div>
    </ArenaToolDrawer>
  );
}
