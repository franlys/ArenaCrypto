/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix framer-motion SSR with bundler moduleResolution
  transpilePackages: ['framer-motion'],

  webpack: (config) => {
    // Stub optional native deps that MetaMask SDK & pino try to require
    // but are not needed in a browser/Next.js context.
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': false,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },

  // Suppress Reown 403 warning in dev server logs until domain is whitelisted
  // in cloud.reown.com — add localhost:3000 there to remove this filter
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

module.exports = nextConfig;
