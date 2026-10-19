import type { Metadata, Viewport } from "next";
import PwaRuntime from "@/components/PwaRuntime";
import "./globals.css";
import "../styles/classroom-overview.css";
import "../styles/timer-panel.css";
import "../styles/mobile-reflow.css";

export const metadata: Metadata = {
  title: "Arena Dev",
  description: "Gamificação para turmas de Desenvolvimento de Sistemas",
  applicationName: "Arena Dev",
  manifest: "/manifest.webmanifest",
  // 11.7: icons repeat the in-app brand mark (green square, dark "A"); the
  // previous purple diamond did not belong to the product identity.
  icons: {
    icon: [
      { url: "/icons/arena.svg", type: "image/svg+xml" },
      { url: "/icons/arena-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/arena-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/arena-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/icons/arena-apple-180.png", sizes: "180x180" },
  },
  appleWebApp: {
    capable: true,
    title: "Arena Dev",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08100e" },
    { media: "(prefers-color-scheme: light)", color: "#e9eeeb" },
  ],
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
