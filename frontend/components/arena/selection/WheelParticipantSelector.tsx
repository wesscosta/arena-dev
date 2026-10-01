"use client";

import type { Student } from "@/lib/types";
import DrawWheel from "@/components/arena/draw/DrawWheel";

export default function WheelParticipantSelector({
  participants,
  selectedStudentId,
  drawing,
  onDraw,
}: {
  participants: Student[];
  selectedStudentId?: string;
  drawing: boolean;
  onDraw: () => void;
}) {
  return (
    <div className="draw-wheel-hero-stage">
      <DrawWheel
        participants={participants}
        selectedStudentId={selectedStudentId}
        drawing={drawing}
        onDraw={onDraw}
      />
    </div>
  );
}
