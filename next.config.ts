import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    unoptimized: true, // Bypass optimization to avoid private IP resolution issues in dev/VPN
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.alicdn.com',
      },
      {
        protocol: 'https',
        hostname: '**.made-in-china.com',
      },
    ],
  },
};

export default nextConfig;
