import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use webpack for WASM support (sql.js)
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // sql.js tries to require 'fs' and 'path' which aren't available in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
  // Empty turbopack config to signal we intentionally want webpack
  turbopack: {},
};

export default nextConfig;
