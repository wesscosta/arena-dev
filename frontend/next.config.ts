import type { NextConfig } from "next";

const internalApiUrl = (process.env.INTERNAL_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
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
