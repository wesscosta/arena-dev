"use client";

import type { JourneyStage } from "@/lib/journey-api";
import styles from "./JourneyMapPreview.module.css";

type PreviewStage = Omit<Pick<JourneyStage, "title" | "description" | "sectionId" | "sectionTitle" | "itemType">, never> & { id?: string };

type Props = {
  title: string;
  description?: string | null;
  stages: PreviewStage[];
  compact?: boolean;
};

type Group = {
  key: string;
  title: string;
  stages: PreviewStage[];
};

function typeMeta(type: PreviewStage["itemType"]) {
  if (type === "QUIZ") return { icon: "?", label: "Quiz" };
  if (type === "CHALLENGE") return { icon: "⚔", label: "Desafio" };
  if (type === "CHECKPOINT") return { icon: "★", label: "Checkpoint" };
  if (type === "EXTERNAL_RESOURCE") return { icon: "↗", label: "Recurso" };
  if (type === "ACTIVITY") return { icon: "◆", label: "Atividade" };
  return { icon: "●", label: "Conteúdo" };
}

function groupsFor(stages: PreviewStage[]): Group[] {
  const groups = new Map<string, Group>();
  stages.forEach((stage, index) => {
    const key = stage.sectionId || stage.sectionTitle || "default";
    const title = stage.sectionTitle || "Jornada principal";
    const group = groups.get(key) ?? { key, title, stages: [] };
    group.stages.push(stage);
    groups.set(key, group);
  });
  return [...groups.values()];
}

export default function JourneyMapPreview({ title, description, stages, compact = false }: Props) {
  const groups = groupsFor(stages);
  const total = stages.length;

  return (
    <div className={`${styles.preview} ${compact ? styles.compact : ""}`}>
      <div className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>PRÉVIA DA EXPERIÊNCIA DO ALUNO</span>
          <h3>{title || "Jornada sem título"}</h3>
          <p>{description || "A progressão visual será construída a partir dos módulos e itens da jornada."}</p>
        </div>
        <div className={styles.progressSummary}>
          <strong>0/{total}</strong>
          <span>itens concluídos</span>
          <div><i /></div>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className={styles.empty}>Adicione itens à jornada para visualizar o percurso.</div>
      ) : (
        <div className={styles.chapters}>
          {groups.map((group, groupIndex) => (
            <section className={styles.chapter} key={group.key}>
              <header className={styles.chapterHeader}>
                <div className={styles.chapterIndex}>{String(groupIndex + 1).padStart(2, "0")}</div>
                <div>
                  <span>CAPÍTULO {String(groupIndex + 1).padStart(2, "0")}</span>
                  <h4>{group.title}</h4>
                </div>
                <small>{group.stages.length} {group.stages.length === 1 ? "item" : "itens"}</small>
              </header>

              <div className={styles.path}>
                {group.stages.map((stage, stageIndex) => {
                  const meta = typeMeta(stage.itemType);
                  const isCurrent = groupIndex === 0 && stageIndex === 0;
                  return (
                    <div className={styles.pathStep} key={stage.id || `${group.key}-${stageIndex}`}>
                      {stageIndex > 0 && <span className={styles.connector} aria-hidden="true" />}
                      <div className={`${styles.node} ${isCurrent ? styles.current : styles.locked}`}>
                        <span className={styles.nodeIcon}>{isCurrent ? meta.icon : "·"}</span>
                        {!isCurrent && <span className={styles.lock} aria-hidden="true">⌁</span>}
                      </div>
                      <div className={styles.nodeCopy}>
                        <span>{meta.label}</span>
                        <strong>{stage.title}</strong>
                        {isCurrent && <b>Comece aqui</b>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
      <p className={styles.disclaimer}>Prévia estrutural: os estados reais de progresso serão calculados individualmente para cada aluno.</p>
    </div>
  );
}
