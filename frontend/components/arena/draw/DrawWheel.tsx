"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
const VIEWBOX_HEIGHT = 440;
const CENTER_X = 500;
const CENTER_Y = 430;

const OUTER_RADIUS_X = 478;
const OUTER_RADIUS_Y = 388;
const INNER_RADIUS_X = 284;
const INNER_RADIUS_Y = 224;
const LABEL_RADIUS_X = 382;
const LABEL_RADIUS_Y = 306;

const NARROW_SLOT_COUNT = 5;
const WIDE_SLOT_COUNT = 7;
const WIDE_THRESHOLD = 1180;
const MAX_LABEL_ROTATION = 20;

function ellipticalPoint(radiusX: number, radiusY: number, angleDeg: number) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER_X + Math.cos(angle) * radiusX,
    y: CENTER_Y + Math.sin(angle) * radiusY,
  };
}

function segmentPath(startAngle: number, endAngle: number) {
  const outerStart = ellipticalPoint(OUTER_RADIUS_X, OUTER_RADIUS_Y, startAngle);
  const outerEnd = ellipticalPoint(OUTER_RADIUS_X, OUTER_RADIUS_Y, endAngle);
  const innerEnd = ellipticalPoint(INNER_RADIUS_X, INNER_RADIUS_Y, endAngle);
  const innerStart = ellipticalPoint(INNER_RADIUS_X, INNER_RADIUS_Y, startAngle);

  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${OUTER_RADIUS_X} ${OUTER_RADIUS_Y} 0 0 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${INNER_RADIUS_X} ${INNER_RADIUS_Y} 0 0 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
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

function shortName(name: string) {
  const firstName = name.trim().split(/\s+/)[0] || name;
  return firstName.length > 12 ? `${firstName.slice(0, 11)}…` : firstName;
}

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function visibleSlotCount(width: number) {
  if (width <= 0) return NARROW_SLOT_COUNT;
  return width >= WIDE_THRESHOLD ? WIDE_SLOT_COUNT : NARROW_SLOT_COUNT;
}

function labelRotation(midAngle: number) {
  const normalized = midAngle - 270;
  return Math.max(-MAX_LABEL_ROTATION, Math.min(MAX_LABEL_ROTATION, normalized * 0.32));
}

export default function DrawWheel({ participants, selectedStudentId, drawing, onDraw }: DrawWheelProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [wheelWidth, setWheelWidth] = useState(0);
  const [windowStart, setWindowStart] = useState(0);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const updateWidth = () => setWheelWidth(element.getBoundingClientRect().width);
    updateWidth();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWheelWidth(entry.contentRect.width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const visibleSlots = visibleSlotCount(wheelWidth);
  const centerSlotIndex = Math.floor(visibleSlots / 2);
  const carouselMode = participants.length > visibleSlots;

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

    setWindowStart(wrapIndex(winnerIndex - centerSlotIndex, participants.length));
  }, [carouselMode, centerSlotIndex, drawing, selectedStudentId, participants]);

  const visibleParticipants = useMemo(() => {
    if (!carouselMode) {
      return participants.map((student, slotIndex) => ({ slotIndex, student }));
    }

    return Array.from({ length: visibleSlots }, (_, slotIndex) => ({
      slotIndex,
      student: participants[wrapIndex(windowStart + slotIndex, participants.length)],
    }));
  }, [carouselMode, participants, visibleSlots, windowStart]);

  const segmentCount = carouselMode ? visibleSlots : Math.max(participants.length, 1);
  const segmentAngle = 180 / segmentCount;
  const gap = carouselMode ? 1.35 : 1.05;

  return (
    <section
      className={styles.stage}
      aria-label={carouselMode ? "Roleta dinâmica de participantes" : "Roleta de participantes"}
      data-mode={carouselMode ? "carousel" : "static"}
      data-slots={visibleSlots}
    >
      <div className={styles.viewport} ref={viewportRef}>
        <svg
          className={styles.wheel}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          role="img"
          aria-label={
            carouselMode
              ? `Roleta com ${participants.length} participantes e ${visibleSlots} casas visíveis`
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
            d={`M ${CENTER_X - OUTER_RADIUS_X} ${CENTER_Y} A ${OUTER_RADIUS_X} ${OUTER_RADIUS_Y} 0 0 1 ${CENTER_X + OUTER_RADIUS_X} ${CENTER_Y}`}
          />
          <path
            className={styles.innerGuide}
            d={`M ${CENTER_X - INNER_RADIUS_X} ${CENTER_Y} A ${INNER_RADIUS_X} ${INNER_RADIUS_Y} 0 0 1 ${CENTER_X + INNER_RADIUS_X} ${CENTER_Y}`}
          />

          <g className={drawing ? styles.drawing : undefined}>
            {visibleParticipants.map(({ slotIndex, student }) => {
              const start = 180 + slotIndex * segmentAngle + gap;
              const end = 180 + (slotIndex + 1) * segmentAngle - gap;
              const mid = 180 + (slotIndex + 0.5) * segmentAngle;
              const labelPoint = ellipticalPoint(LABEL_RADIUS_X, LABEL_RADIUS_Y, mid);
              const rotation = labelRotation(mid);
              const selected = student.id === selectedStudentId;
              const displayName = shortName(student.nickname || student.name);
              const centerSlot = carouselMode && slotIndex === centerSlotIndex;

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

                  <g
                    className={styles.participantLabel}
                    transform={`translate(${labelPoint.x.toFixed(2)} ${labelPoint.y.toFixed(2)}) rotate(${rotation.toFixed(2)})`}
                  >
                    <circle className={styles.avatarHalo} r={selected ? 41 : 34} />
                    <circle className={styles.avatar} r={selected ? 32 : 28} />
                    <text className={styles.initials} textAnchor="middle" dominantBaseline="middle" y="-1">
                      {initials(student.name)}
                    </text>
                    <text className={styles.name} textAnchor="middle" y={selected ? 56 : 49}>
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
            <span>{visibleSlots} casas visíveis</span>
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
