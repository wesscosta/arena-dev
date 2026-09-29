"use client";

import { useEffect } from "react";
import { lockBodyScroll } from "@/lib/body-scroll-lock";

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    return lockBodyScroll();
  }, [locked]);
}
