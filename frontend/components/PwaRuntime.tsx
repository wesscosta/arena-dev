"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaRuntime() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installVisible, setInstallVisible] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    // An active tab may have an unsent answer. Never reload on a controller change.
    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (active && hadController) setUpdateAvailable(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    let registration: ServiceWorkerRegistration | undefined;
    const onOnline = () => { void registration?.update().catch(() => undefined); };
    window.addEventListener("online", onOnline);

    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((result) => {
        if (!active) return;
        registration = result;
        void result.update().catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const joinRoute = window.location.pathname.startsWith("/join");
    if (standalone || !joinRoute) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setInstallVisible(true);
    };
    const onInstalled = () => {
      setInstallVisible(false);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallVisible(false);
    setInstallPrompt(null);
  }

  return (
    <>
      {updateAvailable && (
        <aside className="pwa-install-prompt" role="status" aria-label="Atualização da Arena Dev">
          <div>
            <strong>Nova versão disponível</strong>
            <span>Conclua sua resposta antes de atualizar. Nada será enviado automaticamente.</span>
          </div>
          <div>
            <button type="button" onClick={() => window.location.reload()}>Atualizar agora</button>
            <button type="button" className="ghost" onClick={() => setUpdateAvailable(false)}>Depois</button>
          </div>
        </aside>
      )}
      {installVisible && (
        <aside className="pwa-install-prompt" aria-label="Instalar Arena Dev">
          <div>
            <strong>Instalar Arena Dev</strong>
            <span>Abra o /join como aplicativo neste dispositivo.</span>
          </div>
          <div>
            <button type="button" onClick={() => void install()}>Instalar</button>
            <button type="button" className="ghost" onClick={() => setInstallVisible(false)}>Agora não</button>
          </div>
        </aside>
      )}
    </>
  );
}
