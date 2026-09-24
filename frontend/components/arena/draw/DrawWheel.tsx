"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Student } from "@/lib/types";
import styles from "./DrawWheel.module.css";

type DrawWheelProps = {
  participants: Student[];
  selectedStudentId?: string;
  drawing: boolean;
  onDraw: () => void;
};

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 520;
const CENTER_X = 500;
const CENTER_Y = 500;
const OUTER_RADIUS = 478;
const INNER_RADIUS = 268;
const LABEL_RADIUS = 372;

const STATIC_LIMIT = 6;
const VISIBLE_SLOTS = 7;
const CENTER_SLOT_INDEX = Math.floor(VISIBLE_SLOTS / 2);

function polar(radius: number, angleDeg: number) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER_X + Math.cos(angle) * radius,
    y: CENTER_Y + Math.sin(angle) * radius,
  };
}

function segmentPath(startAngle: number, endAngle: number) {
  const outerStart = polar(OUTER_RADIUS, startAngle);
  const outerEnd = polar(OUTER_RADIUS, endAngle);
  const innerEnd = polar(INNER_RADIUS, endAngle);
  const innerStart = polar(INNER_RADIUS, startAngle);

  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 0 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

export default function DrawWheel({ participants, selectedStudentId, drawing, onDraw }: DrawWheelProps) {
  const carouselMode = participants.length > STATIC_LIMIT;
  const [windowStart, setWindowStart] = useState(0);

  useEffect(() => {
    if (!carouselMode || !drawing || participants.length === 0) return;

    const intervalId = window.setInterval(() => {
      setWindowStart((current) => wrapIndex(current + 1, participants.length));
    }, 95);

    return () => window.clearInterval(intervalId);
  }, [carouselMode, drawing, participants.length]);

  useEffect(() => {
    if (!carouselMode || drawing || !selectedStudentId || participants.length === 0) return;
    const winnerIndex = participants.findIndex((student) => student.id === selectedStudentId);
    if (winnerIndex < 0) return;

    setWindowStart(wrapIndex(winnerIndex - CENTER_SLOT_INDEX, participants.length));
  }, [carouselMode, drawing, selectedStudentId, participants]);

  const visibleParticipants = useMemo(() => {
    if (!carouselMode) {
      return participants.map((student, slotIndex) => ({ slotIndex, student }));
    }

    return Array.from({ length: VISIBLE_SLOTS }, (_, slotIndex) => ({
      slotIndex,
      student: participants[wrapIndex(windowStart + slotIndex, participants.length)],
    }));
  }, [carouselMode, participants, windowStart]);

  const segmentCount = carouselMode ? VISIBLE_SLOTS : Math.max(participants.length, 1);
  const segmentAngle = 180 / segmentCount;
  const gap = carouselMode ? 1.2 : 1;

  return (
    <section
      className={styles.stage}
      aria-label={carouselMode ? "Roleta dinâmica de participantes" : "Roleta de participantes"}
      data-mode={carouselMode ? "carousel" : "static"}
    >
      <div className={styles.viewport}>
        <svg
          className={styles.wheel}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          role="img"
          aria-label={
            carouselMode
              ? `Roleta com ${participants.length} participantes e ${VISIBLE_SLOTS} casas visíveis`
              : `Roleta semicircular com ${participants.length} participante(s)`
          }
          preserveAspectRatio="xMidYMax meet"
        >
          <defs>
            <linearGradient id="draw-wheel-base" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--draw-wheel-segment-top)" />
              <stop offset="100%" stopColor="var(--draw-wheel-segment-bottom)" />
            </linearGradient>
            <linearGradient id="draw-wheel-selected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--draw-wheel-selected-top)" />
              <stop offset="100%" stopColor="var(--draw-wheel-selected-bottom)" />
            </linearGradient>
            <filter id="draw-wheel-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="9" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            className={styles.outerGuide}
            d={`M 22 500 A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 978 500`}
          />
          <path
            className={styles.innerGuide}
            d={`M 232 500 A ${INNER_RADIUS} ${INNER_RADIUS} 0 0 1 768 500`}
          />

          <g className={drawing ? styles.drawing : undefined}>
            {visibleParticipants.map(({ slotIndex, student }) => {
              const start = 180 + slotIndex * segmentAngle + gap;
              const end = 180 + (slotIndex + 1) * segmentAngle - gap;
              const mid = 180 + (slotIndex + 0.5) * segmentAngle;
              const labelPoint = polar(LABEL_RADIUS, mid);
              const selected = student.id === selectedStudentId;
              const displayName = student.nickname || student.name.split(" ")[0];
              const centerSlot = carouselMode && slotIndex === CENTER_SLOT_INDEX;

              return (
                <g
                  key={carouselMode ? `slot-${slotIndex}` : student.id}
                  className={[
                    selected ? styles.segmentSelected : styles.segment,
                    centerSlot ? styles.centerSlot : "",
                  ].filter(Boolean).join(" ")}
                  style={{ "--segment-index": slotIndex } as CSSProperties}
                >
                  <path
                    className={styles.segmentShape}
                    d={segmentPath(start, end)}
                    fill={selected ? "url(#draw-wheel-selected)" : "url(#draw-wheel-base)"}
                    filter={selected ? "url(#draw-wheel-glow)" : undefined}
                  />

                  <g transform={`translate(${labelPoint.x.toFixed(2)} ${labelPoint.y.toFixed(2)})`}>
                    <circle className={styles.avatarHalo} r={selected ? 39 : 33} />
                    <circle className={styles.avatar} r={selected ? 31 : 27} />
                    <text className={styles.initials} textAnchor="middle" dominantBaseline="middle" y="-1">
                      {initials(student.name)}
                    </text>
                    <text className={styles.name} textAnchor="middle" y={selected ? 53 : 47}>
                      {displayName}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {carouselMode && (
          <div className={styles.carouselHint} aria-hidden="true">
            <span>{VISIBLE_SLOTS} casas visíveis</span>
            <span>{participants.length} participantes na rodada</span>
          </div>
        )}

        <button
          type="button"
          className={styles.commandHub}
          onClick={onDraw}
          disabled={drawing || participants.length === 0}
          aria-label={drawing ? "Sorteio em andamento" : "Sortear aluno"}
        >
          <span className={styles.commandIcon} aria-hidden="true">◇</span>
          <strong>{drawing ? "SORTEANDO..." : "SORTEAR"}</strong>
          <small>{drawing ? "aguarde" : "clique para iniciar"}</small>
        </button>
      </div>
    </section>
  );
}
