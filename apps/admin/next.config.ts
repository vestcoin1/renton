import type { NextConfig } from "next";

/**
 * Admin portal, deployed on its own. It lives under /admin so the web app can serve it on the main
 * domain through a rewrite (Next.js multi-zones); it also works opened directly at <admin-host>/admin.
 */
const nextConfig: NextConfig = {
  basePath: "/admin",
  transpilePackages: ["renton-shared", "renton-core", "renton-ui"],
  env: { NEXT_PUBLIC_ZONE: "admin" },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  // Opening the admin host's bare domain (e.g. localhost:3001) should land on the portal, not a 404.
  async redirects() {
    return [{ source: "/", destination: "/admin", basePath: false, permanent: false }];
  },
};

export default nextConfig;


