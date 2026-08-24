import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Next's trailing-slash normalization (`/foo/` -> `/foo`) runs ahead of the
  // rewrites in vercel.json, which made `/clickme/` 308 to `/clickme` before the
  // exact-match rewrite could serve it -- and `/clickme` redirects back, so the
  // two looped. Skipping the built-in redirect lets the rewrite handle `/clickme/`.
  skipTrailingSlashRedirect: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.ufs.sh",
      },
    ],
  },
}

export default nextConfig
