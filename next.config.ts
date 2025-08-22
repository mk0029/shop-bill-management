import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Use a custom dist directory locally to avoid Windows file lock issues on .next
  // but keep the default on Vercel so it generates /.next/routes-manifest.json
  distDir: process.env.VERCEL ? ".next" : ".next-build",
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
