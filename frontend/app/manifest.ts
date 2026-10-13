import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ramuvi",
    short_name: "Ramuvi",
    description: "Jornadas de estudo, atividades e aprendizagem ao vivo.",
    start_url: "/join",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#142b60",
    theme_color: "#142b60",
    lang: "pt-BR",
    icons: [
      { src: "/icons/ramuvi-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/ramuvi-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/ramuvi-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
