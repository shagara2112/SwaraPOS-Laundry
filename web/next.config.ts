import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Logika bisnis bersama dikonsumsi sebagai sumber TypeScript dari workspace.
  transpilePackages: ["@swarapos/core"],
};

export default nextConfig;
