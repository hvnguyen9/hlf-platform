import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg and Prisma's driver adapter use native Node.js bindings.
  // Mark them external so Turbopack doesn't try to bundle them.
  serverExternalPackages: ["pg", "@prisma/client", "@prisma/adapter-pg"],
};

export default nextConfig;
