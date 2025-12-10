import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
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
