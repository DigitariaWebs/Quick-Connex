import type { NextConfig } from "next";

/**
 * Optimized Next.js Configuration
 * 
 * This configuration includes:
 * - Performance optimizations
 * - Security best practices
 * - Development experience improvements
 * - Production build optimizations
 * - File watching exclusions to prevent unnecessary recompilations
 */

const nextConfig: NextConfig = {
  // React strict mode for better development experience
  reactStrictMode: true,

  // Compiler options
  // Note: SWC minification is enabled by default in Next.js 15+
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"], // Keep errors and warnings
    } : false,
  },

  // Image optimization configuration
  images: {
    // Enable image optimization
    formats: ["image/avif", "image/webp"],
    // Configure remote image domains if needed
    remotePatterns: [],
    // Disable image optimization in development for faster builds
    unoptimized: process.env.NODE_ENV === "development",
    // Image quality settings
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Output configuration
  output: "standalone", // Optimized for production deployments

  // Experimental features (Next.js 15)
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // Optimize package imports
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-select",
      "@radix-ui/react-slot",
    ],
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Development-specific optimizations
    if (dev) {
      // Optimize file watching to prevent unnecessary recompilations
      // Webpack requires ignored to be either all strings (glob patterns) or a single RegExp
      const ignoredPatterns = [
        "**/node_modules/**",
        "**/.next/**",
        "**/public/**",
        "**/.git/**",
        "**/.cursor/**",
        "**/.vscode/**",
        "**/.idea/**",
        "**/coverage/**",
        "**/dist/**",
        "**/build/**",
        "**/out/**",
        // Log files (comprehensive patterns)
        "**/*.log",
        "**/server.log",
        "**/npm-debug.log*",
        "**/yarn-debug.log*",
        "**/yarn-error.log*",
        "**/.pnpm-debug.log*",
        // Data files that shouldn't trigger recompilation
        "**/cookies.txt",
        "**/data.txt",
        "**/production_credentials.txt",
        "**/test_users_credentials.txt",
        "**/vapid-keys.txt",
        "**/secrets.txt",
        "**/things.txt",
        // Additional .txt files in root (not in src/)
        "cookies.txt",
        "data.txt",
        "production_credentials.txt",
        "test_users_credentials.txt",
        "vapid-keys.txt",
        "secrets.txt",
        "things.txt",
        // Test and documentation files
        "**/test/**",
        "**/docs/**/*.md",
        // Temporary files
        "**/.DS_Store",
        "**/Thumbs.db",
        "**/*.swp",
        "**/*.swo",
        "**/*~",
        // Environment files
        "**/.env*.local",
        "**/.env*.backup",
        // Build artifacts
        "**/*.tsbuildinfo",
        "**/next-env.d.ts",
        // Markdown files in docs and test directories (documentation)
        "**/docs/**/*.md",
        "**/test/**/*.md",
      ];

      config.watchOptions = {
        ...config.watchOptions,
        ignored: ignoredPatterns,
        // Aggregate changes before triggering rebuild
        aggregateTimeout: 600,
        // Use polling only if native watching fails
        poll: false,
        // Follow symbolic links
        followSymlinks: true,
      };

      // Faster rebuilds in development
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }

    // Production optimizations
    if (!dev) {
      // Optimize chunk splitting
      config.optimization = {
        ...config.optimization,
        moduleIds: "deterministic",
        runtimeChunk: "single",
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: "vendor",
              chunks: "all",
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: "common",
              minChunks: 2,
              chunks: "all",
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }

    // Add build-time environment variables as webpack defines
    // Note: Use NEXT_PUBLIC_ prefix for client-side variables
    config.plugins.push(
      new webpack.DefinePlugin({
        "process.env.BUILD_TIME_VARS": JSON.stringify({
          BASE_URL: process.env.BASE_URL,
          EMAIL_FROM: process.env.EMAIL_FROM,
          ADMIN_EMAIL: process.env.ADMIN_EMAIL,
          MONGODB_URI: process.env.MONGODB_URI,
          JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
        }),
        // Add build ID for cache busting
        "process.env.NEXT_BUILD_ID": JSON.stringify(buildId),
      })
    );

    // Ignore warnings from dependencies
    config.ignoreWarnings = [
      {
        module: /node_modules\/handlebars/,
        message: /require\.extensions is not supported by webpack/,
      },
      // Ignore source map warnings in production
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              module: /node_modules/,
              message: /Failed to parse source map/,
            },
          ]
        : []),
    ];

    // Handle special file types
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        // Add fallbacks for Node.js modules if needed
        fs: false,
        net: false,
        tls: false,
      },
    };

    return config;
  },

  // TypeScript configuration
  typescript: {
    // Fail build on TypeScript errors in production
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Fail build on ESLint errors in production
    ignoreDuringBuilds: false,
  },

  // Power optimization for production
  poweredByHeader: false,

  // Compression
  compress: true,

  // Generate ETags for better caching
  generateEtags: true,

  // Page extensions
  pageExtensions: ["ts", "tsx", "js", "jsx"],

  // Redirects configuration (add as needed)
  async redirects() {
    return [];
  },

  // Rewrites configuration (add as needed)
  async rewrites() {
    return [];
  },
};

export default nextConfig;
