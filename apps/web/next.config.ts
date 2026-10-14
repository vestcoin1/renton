import type { NextConfig } from "next";

/**
 * The admin portal is a separate app (apps/admin) and deployment. Web proxies /admin/** to it so
 * both are served from one domain and share the signed-in session (Next.js multi-zones).
 */
const ADMIN_URL = (process.env.ADMIN_URL ?? "http://localhost:3001").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // The shared packages ship TypeScript source; Next compiles them with the app.
  transpilePackages: ["renton-shared", "renton-core", "renton-ui"],
  env: { NEXT_PUBLIC_ZONE: "web" },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // Future: Supabase Storage bucket, e.g. { protocol: "https", hostname: "<project>.supabase.co" }
    ],
  },
  async rewrites() {
    return [
      { source: "/admin", destination: `${ADMIN_URL}/admin` },
      { source: "/admin/:path*", destination: `${ADMIN_URL}/admin/:path*` },
    ];
  },
};

export default nextConfig;


