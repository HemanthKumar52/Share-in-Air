import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Screen sharing + getUserMedia require a secure context. On localhost this is
  // satisfied automatically; in production Vercel serves HTTPS. The headers below
  // grant this origin permission to use the relevant device APIs.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "display-capture=(self), camera=(self), microphone=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
