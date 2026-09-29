import type { ReactNode } from "react";
import StudyShell from "@/components/study/StudyShell";

export default function LearnLayout({ children }: { children: ReactNode }) {
  return <StudyShell>{children}</StudyShell>;
}
