import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
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
