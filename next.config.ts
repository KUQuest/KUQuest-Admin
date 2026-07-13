import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;