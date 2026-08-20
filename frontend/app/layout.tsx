import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arena Dev",
  description: "Gamificação para turmas de Desenvolvimento de Sistemas",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
