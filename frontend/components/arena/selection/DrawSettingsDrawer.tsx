"use client";

import ArenaToolDrawer from "@/components/ArenaToolDrawer";
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
      <div className="draw-settings-panel">
        <section className="draw-settings-mode">
          <span className="draw-settings-label">CRITÉRIO DE SELEÇÃO</span>
          <div className="draw-settings-mode-card">
            <span className="draw-mode-radio" aria-hidden="true" />
            <div>
              <strong>Balanceado</strong>
              <p>Prioriza quem foi sorteado menos vezes durante a sessão.</p>
            </div>
          </div>
        </section>

        <section className="draw-settings-presentation">
          <span className="draw-settings-label">APRESENTAÇÃO</span>
          <div
            className="draw-settings-choice-list"
            role="radiogroup"
            aria-label="Apresentação do sorteio"
          >
            <label className={mode === "grid-spotlight" ? "draw-settings-choice active" : "draw-settings-choice"}>
              <input
                className="draw-settings-choice-input"
                type="radio"
                name="draw-presentation"
                value="grid-spotlight"
                checked={mode === "grid-spotlight"}
                disabled={busy}
                onChange={() => onPresentationChange("grid-spotlight")}
              />
              <span className="draw-settings-choice-radio" aria-hidden="true" />
              <span>
                <strong>Grid + Spotlight</strong>
                <small>Mostra a turma em cards e destaca apenas o participante sorteado.</small>
              </span>
            </label>

            <label className={mode === "wheel" ? "draw-settings-choice active" : "draw-settings-choice"}>
              <input
                className="draw-settings-choice-input"
                type="radio"
                name="draw-presentation"
                value="wheel"
                checked={mode === "wheel"}
                disabled={busy}
                onChange={() => onPresentationChange("wheel")}
              />
              <span className="draw-settings-choice-radio" aria-hidden="true" />
              <span>
                <strong>Roleta</strong>
                <small>Mantém a seleção balanceada e altera somente a apresentação visual.</small>
              </span>
            </label>
          </div>
          <p className="draw-settings-persistence-note">
            A apresentação escolhida fica salva nesta sessão.
          </p>
        </section>

        <section className="draw-settings-rules">
          <span className="draw-settings-label">REGRAS DA SELEÇÃO</span>
          <div className="draw-settings-rule">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>Apenas presentes</strong>
              <p>Somente alunos marcados como presentes entram no sorteio.</p>
            </div>
          </div>
          <div className="draw-settings-rule">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>Evita repetição imediata</strong>
              <p>
                Quando há mais de um participante, o último sorteado não é escolhido novamente na rodada seguinte.
              </p>
            </div>
          </div>
        </section>

        <section className="draw-settings-explainer">
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
