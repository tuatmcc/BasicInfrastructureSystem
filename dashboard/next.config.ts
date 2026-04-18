import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    DBAPI_BASE_URL: process.env.DBAPI_BASE_URL,
  },
};

export default nextConfig;
