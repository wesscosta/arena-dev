import type { Metadata, Viewport } from "next";
import PwaRuntime from "@/components/PwaRuntime";
import "./globals.css";
import "../styles/classroom-overview.css";
import "../styles/timer-panel.css";
import "../styles/mobile-reflow.css";
import "../styles/ramuvi-brand.css";
import "../styles/v012-pilots.css";

export const metadata: Metadata = {
  title: "Ramuvi",
  description: "Ambiente de aprendizagem: jornadas de estudo, atividades e interações ao vivo.",
  applicationName: "Ramuvi",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/ramuvi-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/ramuvi-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/ramuvi-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Ramuvi",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#142b60",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem('arena-dev-theme')||'system';var l=window.matchMedia('(prefers-color-scheme: light)').matches;var r=p==='system'?(l?'light':'dark'):p;document.documentElement.dataset.theme=r;document.documentElement.dataset.themePreference=p;document.documentElement.style.colorScheme=r;}catch(e){document.documentElement.dataset.theme='dark';}})();`,
          }}
        />
        <PwaRuntime />
        {children}
      </body>
    </html>
  );
}
