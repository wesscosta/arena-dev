import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arena Dev",
    short_name: "Arena Dev",
    description: "Participação ao vivo em aulas com Quiz, votação, nuvem de palavras e dinâmicas da Arena.",
    start_url: "/join",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0b1020",
    theme_color: "#0b1020",
    lang: "pt-BR",
    icons: [
      { src: "/icons/arena-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/arena-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/arena-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
