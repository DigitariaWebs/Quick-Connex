import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features
  experimental: {
    // Add any experimental features you need
  },
  
  // Environment variables configuration
  env: {
    // Make these available at build time
    BUILD_TIME_BASE_URL: process.env.BASE_URL,
    BUILD_TIME_EMAIL_FROM: process.env.EMAIL_FROM,
    BUILD_TIME_ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    BUILD_TIME_MONGODB_URI: process.env.MONGODB_URI,
    BUILD_TIME_JWT_SECRET: process.env.JWT_SECRET_KEY,
  },
  
  // Public runtime config (available in browser)
  publicRuntimeConfig: {
    // These will be available in browser
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL,
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL,
  },
  
  // Server runtime config (server-side only)
  serverRuntimeConfig: {
    // These are server-side only
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET_KEY,
    baseUrl: process.env.BASE_URL,
    emailFrom: process.env.EMAIL_FROM,
    adminEmail: process.env.ADMIN_EMAIL,
  },
  
  // Webpack configuration for build-time variables
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add build-time environment variables
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.BUILD_TIME_VARS': JSON.stringify({
          BASE_URL: process.env.BASE_URL,
          EMAIL_FROM: process.env.EMAIL_FROM,
          ADMIN_EMAIL: process.env.ADMIN_EMAIL,
          MONGODB_URI: process.env.MONGODB_URI,
          JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
        })
      })
    );
    
    return config;
  },
};

export default nextConfig;