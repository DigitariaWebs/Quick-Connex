import type { NextConfig } from "next";

// Log when Next.js config is loaded
console.log('\n' + '='.repeat(60));
console.log('🏥 PATIENTS MANAGEMENT SYSTEM - NEXT.JS CONFIG');
console.log('='.repeat(60));
console.log(`📅 Config loaded at: ${new Date().toLocaleString()}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 MongoDB URI: ${process.env.MONGODB_URI ? '✅ Configured' : '❌ Missing'}`);
console.log(`⚡ Bundler: Turbopack (Next.js 15+)`);
console.log('='.repeat(60) + '\n');

const nextConfig: NextConfig = {
  // Turbopack configuration
  experimental: {
    // Enable Turbopack logging
    turbo: {
      // Add custom logging for Turbopack
      logLevel: 'info',
    },
    // Enable verbose logging
    logging: {
      level: 'verbose',
      fetches: {
        fullUrl: true,
      },
    },
  },
  
  // Add custom logging for build process
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
};

export default nextConfig;
