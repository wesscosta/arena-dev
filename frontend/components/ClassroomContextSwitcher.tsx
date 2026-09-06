"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  classroomContextStatus,
  filterClassroomsForContext,
} from "@/lib/classroom-context";
import type { Classroom } from "@/lib/types";
import styles from "./ClassroomContextSwitcher.module.css";

export default function ClassroomContextSwitcher({
  classrooms,
  activeClassroomId,
  liveClassroomIds,
  onSelect,
}: {
  classrooms: Classroom[];
  activeClassroomId?: string;
  liveClassroomIds: string[];
  onSelect: (classroomId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const activeClassroom =
    classrooms.find((classroom) => classroom.id === activeClassroomId)
    ?? classrooms[0];

  const liveIds = useMemo(
    () => new Set(liveClassroomIds),
    [liveClassroomIds],
  );

  const visibleClassrooms = useMemo(
    () => filterClassroomsForContext(classrooms, query),
    [classrooms, query],
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    function closeOnOutside(event: PointerEvent) {
      if (
        rootRef.current
        && !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("pointerdown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!activeClassroom) return null;

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={open ? `${styles.trigger} ${styles.open}` : styles.trigger}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Trocar turma"
      >
        <span className={styles.monogram}>
          {activeClassroom.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className={styles.triggerCopy}>
          <strong>{activeClassroom.name}</strong>
          {activeClassroom.code && <small>{activeClassroom.code}</small>}
        </span>
        <span className={styles.chevron}>⌄</span>
      </button>

      {open && (
        <div className={styles.popover}>
          <div className={styles.searchWrap}>
            <span>⌕</span>
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar turma por nome ou código"
              aria-label="Buscar turma por nome ou código"
            />
          </div>

          <div className={styles.list} role="listbox">
            {!visibleClassrooms.length ? (
              <div className={styles.empty}>Nenhuma turma encontrada.</div>
            ) : (
              visibleClassrooms.map((classroom) => {
                const selected = classroom.id === activeClassroom.id;
                const status = classroomContextStatus(
                  classroom,
                  liveIds.has(classroom.id),
                );

                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    key={classroom.id}
                    className={selected ? styles.selected : undefined}
                    onClick={() => {
                      onSelect(classroom.id);
                      setOpen(false);
                    }}
                  >
                    <span className={styles.itemMonogram}>
                      {classroom.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className={styles.itemCopy}>
                      <strong>{classroom.name}</strong>
                      <small>{classroom.code || "Sem código"}</small>
                    </span>

                    {status === "LIVE" && (
                      <span className={styles.live}><i /> AO VIVO</span>
                    )}
                    {status === "INACTIVE" && (
                      <span className={styles.inactive}>INATIVA</span>
                    )}
                    {selected && !status && (
                      <span className={styles.check}>✓</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
