import type { ReactNode } from "react";

export default function LiveRegion({
  children,
  politeness = "polite",
  atomic = true,
}: {
  children: ReactNode;
  politeness?: "polite" | "assertive";
  atomic?: boolean;
}) {
  return (
    <div
      className="sr-only"
      role={politeness === "assertive" ? "alert" : "status"}
      aria-live={politeness}
      aria-atomic={atomic}
    >
      {children}
    </div>
  );
}
