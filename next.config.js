const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript type checking during builds
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  images: {
    // Replace domains with remotePatterns for better flexibility
    // domains: [
    //   'avatars.githubusercontent.com',
    //   'lh3.googleusercontent.com',
    //   'vercel.com',
    //   'avatar.vercel.sh',
    //   'gwetfkan2dovfoiz.public.blob.vercel-storage.com',
    // ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'vercel.com',
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      },
      {
        protocol: 'https',
        hostname: 'gwetfkan2dovfoiz.public.blob.vercel-storage.com',
      },
      {
        // Add Supabase hostname
        protocol: 'https',
        hostname: 'ugnyocjdcpdlneirkfiq.supabase.co',
      },
    ],
  },
  transpilePackages: ['ai'],
  webpack: (config) => {
    // Updated alias setup to use our patch file
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
      'contentlayer/generated': path.resolve(__dirname, '.contentlayer/generated'),
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      child_process: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
  experimental: {
    // Allow more memory for building
    memoryBasedWorkersCount: true,
  },
};

// Export the plain configuration without any wrappers
module.exports = nextConfig;