import type { NextConfig } from "next";

const SECRETS_MANAGER_URL = process.env.SECRETS_MANAGER_URL || "http://secrets-manager:8092";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: "/secrets-api/:path*",
        destination: `${SECRETS_MANAGER_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
