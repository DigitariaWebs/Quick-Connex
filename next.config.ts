import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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
  },

  // Webpack configuration for build-time variables
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add build-time environment variables
    config.plugins.push(
      new webpack.DefinePlugin({
        "process.env.BUILD_TIME_VARS": JSON.stringify({
          BASE_URL: process.env.BASE_URL,
          EMAIL_FROM: process.env.EMAIL_FROM,
          MONGODB_URI: process.env.MONGODB_URI,
          JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
        }),
      }),
    );

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

    // Ignore handlebars require.extensions warnings
    config.ignoreWarnings = [
      {
        module: /node_modules\/handlebars/,
        message: /require\.extensions is not supported by webpack/,
      },
    ];

    return config;
  },
};

export default withNextIntl(nextConfig);
