import type { NextConfig } from 'next';

// GitHub Pages serves project sites from /<repo>. Override with
// NEXT_PUBLIC_BASE_PATH (e.g. '' for a user/org or custom-domain site).
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  (process.env.NODE_ENV === 'production' ? '/Dialed' : '');

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
