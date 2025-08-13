import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Remove experimental.forceSwcTransforms for Turbopack compatibility
  trailingSlash: false,
  generateBuildId: async () => {
    return "build-" + Date.now();
  },
};

export default nextConfig;
