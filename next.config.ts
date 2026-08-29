import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,

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
