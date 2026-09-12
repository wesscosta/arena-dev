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
    <html lang="pt-BR">
      <body><PwaRuntime />{children}</body>
    </html>
  );
}
