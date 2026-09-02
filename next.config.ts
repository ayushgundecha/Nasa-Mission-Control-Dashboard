import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    typedEnv: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "spacelaunchnow-prod-east.nyc3.digitaloceanspaces.com",
      },
      { protocol: "https", hostname: "images-assets.nasa.gov" },
    ],
  },
};

export default nextConfig;
