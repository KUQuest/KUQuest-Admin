import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  devIndicators: false,

  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
    if (!apiUrl) return [];

    // Keep browser API requests on this host so Next.js can read the Admin session cookie.
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },

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
