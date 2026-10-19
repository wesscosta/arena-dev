import type { NextConfig } from "next";
import { browserSecurityHeaders } from "./lib/security-headers";

const internalApiUrl = (process.env.INTERNAL_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // The app serves no optimized images; turning the optimizer off removes the
  // /_next/image endpoint and its sharp/librsvg decoder from the attack surface.
  images: { unoptimized: true },
  async headers() {
    return [{
      source: "/:path*",
      headers: browserSecurityHeaders(process.env.NEXT_PUBLIC_API_URL,
        process.env.NODE_ENV !== "production"),
    }];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${internalApiUrl}/api/:path*`,
      },
      {
        source: "/ws/:path*",
        destination: `${internalApiUrl}/ws/:path*`,
      },
    ];
  },
};

export default nextConfig;
