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
    domains: [
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
      'vercel.com',
      'avatar.vercel.sh',
      'gwetfkan2dovfoiz.public.blob.vercel-storage.com',
    ],
  },
  transpilePackages: ['ai', '@ai-sdk/react', '@ai-sdk/openai', '@ai-sdk/fireworks', '@openassistantgpt/assistant'],
  webpack: (config) => {
    // Updated alias setup to use our patch file
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
      // Use our custom patch file for all 'ai' imports
      'ai': path.resolve(__dirname, 'app/api/ai-package-patch.ts'),
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