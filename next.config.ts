import type { NextConfig } from 'next';

// Cloudflare Pages serves the site from the domain root, so no base path is
// needed. Set NEXT_PUBLIC_BASE_PATH only if hosting from a sub-path instead.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: basePath || undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
