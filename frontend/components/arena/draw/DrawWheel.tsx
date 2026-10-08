"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Student } from "@/lib/types";
import styles from "./DrawWheel.module.css";

type DrawWheelProps = {
  participants: Student[];
  selectedStudentId?: string;
  drawing: boolean;
  disabled?: boolean;
  onDraw: () => void;
};

const VIEWBOX_WIDTH = 1100;
const VIEWBOX_HEIGHT = 430;
const CENTER_X = 550;
const CENTER_Y = 525;

// Circular geometry is intentional: Rx and Ry must always be identical.
// Relative to the previous horizontal radii, the outer radius grows ~7%
// and the inner radius grows ~15% to open the central void.
const OUTER_RADIUS = 512;
const INNER_RADIUS = 327;
const LABEL_RADIUS = 420;
const AVERAGE_RADIUS = (OUTER_RADIUS + INNER_RADIUS) / 2;

const MIN_VISIBLE_SLOTS = 5;
const MAX_VISIBLE_SLOTS = 9;
const MIN_SLOT_ARC_PX = 150;
const MAX_LABEL_ROTATION = 20;

function circularPoint(radius: number, angleDeg: number) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER_X + Math.cos(angle) * radius,
    y: CENTER_Y + Math.sin(angle) * radius,
  };
}

function segmentPath(startAngle: number, endAngle: number) {
  const outerStart = circularPoint(OUTER_RADIUS, startAngle);
  const outerEnd = circularPoint(OUTER_RADIUS, endAngle);
  const innerEnd = circularPoint(INNER_RADIUS, endAngle);
  const innerStart = circularPoint(INNER_RADIUS, startAngle);

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

function shortName(name: string) {
  const firstName = name.trim().split(/\s+/)[0] || name;
  return firstName.length > 12 ? `${firstName.slice(0, 11)}…` : firstName;
}

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function visibleSlotCount(width: number, participantCount: number) {
  if (participantCount <= 0) return MIN_VISIBLE_SLOTS;
  if (width <= 0) return Math.min(participantCount, MIN_VISIBLE_SLOTS);

  const scale = width / VIEWBOX_WIDTH;
  const visibleArcPx = Math.PI * AVERAGE_RADIUS * scale;
  const capacityByArc = Math.max(MIN_VISIBLE_SLOTS, Math.floor(visibleArcPx / MIN_SLOT_ARC_PX));
  const boundedCapacity = Math.min(participantCount, MAX_VISIBLE_SLOTS, capacityByArc);

  // Prefer an odd number of visible houses so one real segment always sits
  // exactly below the fixed marker. This avoids a marker landing on a seam.
  if (boundedCapacity > MIN_VISIBLE_SLOTS && boundedCapacity % 2 === 0) {
    return boundedCapacity - 1;
  }

  return boundedCapacity;
}

function labelRotation(midAngle: number) {
  const normalized = midAngle - 270;
  return Math.max(-MAX_LABEL_ROTATION, Math.min(MAX_LABEL_ROTATION, normalized * 0.32));
}

export default function DrawWheel({ participants, selectedStudentId, drawing, disabled = false, onDraw }: DrawWheelProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const previousDrawingRef = useRef(drawing);
  const [wheelWidth, setWheelWidth] = useState(0);
  const [windowStart, setWindowStart] = useState(0);
  const [settledPulse, setSettledPulse] = useState(false);

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

  useEffect(() => {
    const wasDrawing = previousDrawingRef.current;
    previousDrawingRef.current = drawing;

    if (!wasDrawing || drawing || !selectedStudentId) return;

    setSettledPulse(true);
    const timeoutId = window.setTimeout(() => setSettledPulse(false), 460);
    return () => window.clearTimeout(timeoutId);
  }, [drawing, selectedStudentId]);

  const visibleSlots = visibleSlotCount(wheelWidth, participants.length);
  const carouselMode = participants.length > visibleSlots;
  const baseSlotCount = carouselMode ? visibleSlots : Math.max(participants.length, 1);
  const renderedSlotCount =
    baseSlotCount > 1 && baseSlotCount % 2 === 0
      ? baseSlotCount + 1
      : baseSlotCount;
  const centerSlotIndex = Math.floor(renderedSlotCount / 2);
  const animatedMode = participants.length > 1;

  useEffect(() => {
    if (!animatedMode || !drawing || participants.length === 0) return;

    let timeoutId: number | undefined;
    let cancelled = false;
    const phaseStartedAt = performance.now();
    const settling = Boolean(selectedStudentId);

    function scheduleNextStep() {
      if (cancelled) return;

      const elapsed = performance.now() - phaseStartedAt;
      const delay = settling
        ? Math.min(260, 78 + elapsed * 0.2)
        : Math.max(64, 112 - elapsed * 0.12);

      timeoutId = window.setTimeout(() => {
        setWindowStart((current) => wrapIndex(current + 1, participants.length));
        scheduleNextStep();
      }, delay);
    }

    scheduleNextStep();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [animatedMode, drawing, participants.length, selectedStudentId]);

  useEffect(() => {
    if (!animatedMode || drawing || !selectedStudentId || participants.length === 0) return;

    const winnerIndex = participants.findIndex((student) => student.id === selectedStudentId);
    if (winnerIndex < 0) return;

    setWindowStart(wrapIndex(winnerIndex - centerSlotIndex, participants.length));
  }, [animatedMode, centerSlotIndex, drawing, selectedStudentId, participants]);

  const visibleParticipants = useMemo(() => {
    if (participants.length === 0) return [];

    const slots = Array.from({ length: renderedSlotCount }, (_, slotIndex) => ({
      slotIndex,
      student: participants[wrapIndex(windowStart + slotIndex, participants.length)] as Student | undefined,
      placeholder: false,
    }));

    if (drawing || renderedSlotCount <= participants.length) return slots;

    const preferredSlotByStudent = new Map<string, number>();
    slots.forEach(({ slotIndex, student }) => {
      if (!student) return;
      const previous = preferredSlotByStudent.get(student.id);
      if (previous === undefined || Math.abs(slotIndex - centerSlotIndex) < Math.abs(previous - centerSlotIndex)) {
        preferredSlotByStudent.set(student.id, slotIndex);
      }
    });

    return slots.map((slot) => {
      if (!slot.student) return slot;
      const preferredSlot = preferredSlotByStudent.get(slot.student.id);
      return preferredSlot === slot.slotIndex
        ? slot
        : { ...slot, student: undefined, placeholder: true };
    });
  }, [centerSlotIndex, drawing, participants, renderedSlotCount, windowStart]);

  const segmentCount = renderedSlotCount;
  const segmentAngle = 180 / segmentCount;
  const gap = carouselMode ? 1.35 : 1.05;

  return (
    <section
      className={styles.stage}
      aria-label={animatedMode ? "Roleta dinâmica de participantes" : "Roleta de participantes"}
      data-mode={carouselMode ? "carousel" : animatedMode ? "animated" : "static"}
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
            d={`M ${CENTER_X - OUTER_RADIUS} ${CENTER_Y} A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 ${CENTER_X + OUTER_RADIUS} ${CENTER_Y}`}
          />
          <path
            className={styles.innerGuide}
            d={`M ${CENTER_X - INNER_RADIUS} ${CENTER_Y} A ${INNER_RADIUS} ${INNER_RADIUS} 0 0 1 ${CENTER_X + INNER_RADIUS} ${CENTER_Y}`}
          />

          <g className={drawing ? styles.drawing : undefined}>
            {visibleParticipants.map(({ slotIndex, student, placeholder }) => {
              const start = 180 + slotIndex * segmentAngle + gap;
              const end = 180 + (slotIndex + 1) * segmentAngle - gap;
              const mid = 180 + (slotIndex + 0.5) * segmentAngle;
              const labelPoint = circularPoint(LABEL_RADIUS, mid);
              const rotation = labelRotation(mid);
              const selected = slotIndex === centerSlotIndex && Boolean(student);
              const displayName = student ? shortName(student.nickname || student.name) : "";
              const centerSlot = slotIndex === centerSlotIndex;

              return (
                <g
                  key={animatedMode ? `slot-${slotIndex}` : student?.id ?? `placeholder-${slotIndex}`}
                  className={[
                    placeholder ? styles.placeholderSegment : selected ? styles.segmentSelected : styles.segment,
                    centerSlot ? styles.centerSlot : "",
                    selected && settledPulse ? styles.settled : "",
                  ].filter(Boolean).join(" ")}
                  style={{ "--segment-index": slotIndex } as CSSProperties}
                >
                  <path
                    className={styles.segmentShape}
                    d={segmentPath(start, end)}
                    fill={selected ? "url(#draw-wheel-selected)" : "url(#draw-wheel-base)"}
                    filter={selected ? "url(#draw-wheel-glow)" : undefined}
                  />

                  {student ? (
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
                  ) : (
                    <text
                      className={styles.placeholderMark}
                      x={labelPoint.x}
                      y={labelPoint.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${rotation.toFixed(2)} ${labelPoint.x.toFixed(2)} ${labelPoint.y.toFixed(2)})`}
                      aria-hidden="true"
                    >
                      ◇
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          <path
            className={styles.pointer}
            d={`M ${CENTER_X - 18} 2 L ${CENTER_X + 18} 2 L ${CENTER_X} 30 Z`}
            aria-hidden="true"
          />
        </svg>

        <button
          type="button"
          className={styles.commandHub}
          onClick={onDraw}
          disabled={drawing || disabled || participants.length === 0}
          aria-label={drawing ? "Sorteio em andamento" : disabled ? "Resolva o sorteio atual para continuar" : "Sortear aluno"}
        >
          <span className={styles.commandIcon} aria-hidden="true">◇</span>
          <strong>{drawing ? "SORTEANDO..." : "SORTEAR"}</strong>
          <small>{drawing ? "aguarde" : "clique para iniciar"}</small>
        </button>
      </div>
    </section>
  );
}
