import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@gifting/shared'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
