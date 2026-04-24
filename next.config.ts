import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@farcaster/mini-app-solana": "./src/lib/emptyModule.ts",
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@farcaster/mini-app-solana": false,
    };
    return config;
  },
};

export default nextConfig;
