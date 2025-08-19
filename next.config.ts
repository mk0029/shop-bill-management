import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Use a custom dist directory to avoid Windows file lock issues on .next
  distDir: ".next-build",
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3333',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Remove experimental.forceSwcTransforms for Turbopack compatibility
  trailingSlash: false,
  generateBuildId: async () => {
    return "build-" + Date.now();
  },
};

export default nextConfig;
