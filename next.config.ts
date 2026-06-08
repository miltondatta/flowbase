import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Optimize webpack watch options for Windows file system to prevent EPERM errors
      config.watchOptions = {
        ...config.watchOptions,
        // Increase aggregate timeout to batch file changes
        aggregateTimeout: 500,
        // Use polling to avoid Windows file lock issues
        poll: 1000,
        // Ignore .next directory to prevent recursive watching
        ignored: ['**/.next/**', '**/node_modules/**'],
      };
    }
    // Add Windows-specific resolve options
    config.resolve = {
      ...config.resolve,
      symlinks: false, // Avoid symlink issues on Windows
    };
    return config;
  },
};

export default nextConfig;
