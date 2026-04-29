import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
  },
  headers: async () => [
    {
      // Cache Cloudinary-proxied images at the edge and browser for 30 days
      source: "/_next/image",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400",
        },
      ],
    },
    {
      // Cache public pages at the edge, serve stale while revalidating
      source: "/artists/:slug*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, s-maxage=60, stale-while-revalidate=300",
        },
      ],
    },
    {
      source: "/artworks/:slug*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, s-maxage=60, stale-while-revalidate=300",
        },
      ],
    },
  ],
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();
