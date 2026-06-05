import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this project (a parent lockfile exists upstream).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
