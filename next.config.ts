 import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Use the default dist directory. Turbopack expects '.next' and may fail to
  // resolve certain internal modules (e.g. next/font loaders) when this is customized.
  distDir: ".next",
  turbopack: {},
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
  // Strip all console.* calls in production builds to keep output clean
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
