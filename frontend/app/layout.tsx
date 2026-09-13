import type { Metadata, Viewport } from "next";
import PwaRuntime from "@/components/PwaRuntime";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arena Dev",
  description: "Gamificação para turmas de Desenvolvimento de Sistemas",
  applicationName: "Arena Dev",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/arena-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/arena-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/arena-192.png",
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
  themeColor: "#0b1020",
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
