"use client";

import { useState } from "react";
import type { ArenaDynamic, ArenaTool } from "./ArenaLiveChrome";

export function useArenaToolState() {
  const [activeDynamic, setActiveDynamic] = useState<ArenaDynamic>("draw");
  const [activeTool, setActiveTool] = useState<ArenaTool>(null);
  const [drawSettingsOpen, setDrawSettingsOpen] = useState(false);
  const [sessionQrOpen, setSessionQrOpen] = useState(false);

  function selectDynamic(dynamic: ArenaDynamic) {
    setActiveDynamic(dynamic);
    setActiveTool(null);
  }

  function selectTool(tool: ArenaTool) {
    setActiveTool(tool);
  }

  function closeTool() {
    setActiveTool(null);
  }

  function resetNavigation(dynamic: ArenaDynamic = "draw") {
    setActiveDynamic(dynamic);
    setActiveTool(null);
  }

  return {
    activeDynamic,
    activeTool,
    drawSettingsOpen,
    sessionQrOpen,
    selectDynamic,
    selectTool,
    closeTool,
    resetNavigation,
    openDrawSettings: () => setDrawSettingsOpen(true),
    closeDrawSettings: () => setDrawSettingsOpen(false),
    openSessionQr: () => setSessionQrOpen(true),
    closeSessionQr: () => setSessionQrOpen(false),
  };
}
